import { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import ConfirmationModal from './ConfirmationModal';
import TaskActivityLogModal from './TaskActivityLogModal';
import UserPickerModal from './UserPickerModal';
import Toast from './Toast';
import {
  getUsers,
  getUsersByPermission,
  uploadTaskDocument,
  getTaskDocuments,
  deleteTaskDocument,
  getTaskDocumentDownloadUrl,
} from '../services/api';

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileBadgeStyle(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return { bg: 'bg-red-50 text-red-700 border-red-200', icon: 'PDF' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'XLS' };
  if (['doc', 'docx'].includes(ext)) return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'DOC' };
  if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) return { bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'IMG' };
  return { bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: ext.toUpperCase() || 'FILE' };
}

const USER_ID_NAME_MAP = {
  'usr-manoj-042': 'Manoj Agarwal',
  'usr-vivek-108': 'Vivek Raj',
  'usr-mainak-215': 'Mainak Gupta',
  'usr-tushar-304': 'Tushar Seth',
  'usr-prayasa-410': 'Prayasa Sharma',
  'usr-avisek-499': 'Avisek Shaw',
  'usr-anirban-001': 'Anirban Paul',
  'usr-annu-002': 'Annu Shaw',
  'usr-avisek2-003': 'Avisek Shaw',
  'usr-ayush-004': 'Ayush Pandey',
  'usr-debajyo-005': 'Debajyoti Dattagupta',
  'usr-isha-006': 'Isha Prasad',
  'usr-king-007': 'Kingshuk Roy',
  'usr-moit-008': 'Moitrayee Dutta',
  'usr-nishan-009': 'Nishan Mandal',
  'usr-rounok-010': 'Rounok Das',
  'usr-sanjeev-011': 'Sanjeev Kumar',
  'usr-sayant-012': 'Sayantan Ghosh',
  'usr-shreya-013': 'Shreya Singh',
  'Tushar Seth': 'Tushar Seth',
  'Vivek Raj': 'Vivek Raj',
  'Mainak Gupta': 'Mainak Gupta',
  'Prayasa Sharma': 'Prayasa Sharma',
  'Manoj Agarwal': 'Manoj Agarwal',
  'Avisek Shaw': 'Avisek Shaw',
};

export default function TaskActionModal({
  isOpen,
  task,
  currentUser,
  onClose,
  onSubmitTask,
  onApproveTask,
  onRejectTask,
  onReassignTask,
}) {
  const [comment, setComment] = useState('');
  const [toastError, setToastError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(null); // 'SUBMIT' | 'APPROVE' | 'REJECT'
  const [rejectionMode, setRejectionMode] = useState('resubmit'); // 'resubmit' | 'permanent'
  const [showHistory, setShowHistory] = useState(true);
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);

  // Document attachments state
  const [documents, setDocuments] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState(null);

  // Reassignment states
  const [showReassignSection, setShowReassignSection] = useState(false);
  const [showMakerPicker, setShowMakerPicker] = useState(false);
  const [showCheckerPicker, setShowCheckerPicker] = useState(false);
  const [permittedMakers, setPermittedMakers] = useState(null);
  const [permittedCheckers, setPermittedCheckers] = useState(null);
  const [selectedMakerIds, setSelectedMakerIds] = useState([]);
  const [selectedCheckerIds, setSelectedCheckerIds] = useState([]);
  const [reassignReason, setReassignReason] = useState('');
  const [reassigning, setReassigning] = useState(false);

  const currentUserId = currentUser?.id || currentUser?.userId || '';
  const rawName = currentUser?.name || '';
  const cleanName = rawName.split(' (')[0].trim().toLowerCase();
  const userRole = currentUser?.role || 'ADMIN';
  const isAdmin = userRole === 'ADMIN';

  const isSopCreator = (task?.sopCreatedBy && task.sopCreatedBy === currentUserId) ||
    (Array.isArray(task?.sopAssignedCreatorIds) && task.sopAssignedCreatorIds.includes(currentUserId));
  const isSopApprover = Array.isArray(task?.sopAssignedApproverIds) && task.sopAssignedApproverIds.includes(currentUserId);
  const canReassign = isAdmin || isSopCreator || isSopApprover;

  useEffect(() => {
    if (isOpen && task) {
      setComment('');
      setToastError('');
      setPendingConfirm(null);
      setRejectionMode('resubmit');
      setShowHistory(true);
      setShowActivityLogModal(false);
      setShowReassignSection(false);
      setShowMakerPicker(false);
      setShowCheckerPicker(false);
      setReassignReason('');

      if (Array.isArray(task.documents)) {
        setDocuments(task.documents);
      }
      if (task.taskId) {
        getTaskDocuments(task.taskId).then(docs => {
          if (Array.isArray(docs)) setDocuments(docs);
        }).catch(() => {});
      }
    } else {
      setDocuments([]);
    }
  }, [isOpen, task]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !task?.taskId) return;

    if (file.size > 25 * 1024 * 1024) {
      setToastError('File size exceeds maximum limit of 25 MB.');
      return;
    }

    setUploadingDoc(true);
    setToastError('');
    try {
      const uploaded = await uploadTaskDocument(task.taskId, file, currentUserId);
      setDocuments(prev => [uploaded, ...prev]);
    } catch (err) {
      setToastError(err.message || 'Failed to upload document to GCS storage.');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleDocumentDelete = async (docId) => {
    if (!task?.taskId || !docId) return;
    setDeletingDocId(docId);
    try {
      await deleteTaskDocument(task.taskId, docId, currentUserId);
      setDocuments(prev => prev.filter(d => d.documentId !== docId));
    } catch (err) {
      setToastError(err.message || 'Failed to delete document.');
    } finally {
      setDeletingDocId(null);
    }
  };

  useEffect(() => {
    if (isOpen && task && canReassign) {
      // Load maker pool: users with MAKER role
      getUsers(task.entityCode, 'MAKER').then(makerUsers => {
        setPermittedMakers(makerUsers || []);
      }).catch(() => setPermittedMakers([]));

      // Load checker pool: users with CHECKER role
      getUsers(task.entityCode, 'CHECKER').then(checkerUsers => {
        setPermittedCheckers(checkerUsers || []);
      }).catch(() => setPermittedCheckers([]));

      setSelectedMakerIds(task.assignedMakerIds || []);
      setSelectedCheckerIds(task.assignedCheckerIds || []);
    }
  }, [isOpen, task, canReassign]);

  if (!isOpen || !task) return null;

  function isUserMatch(personName, personIdList) {
    if (currentUserId && Array.isArray(personIdList) && personIdList.includes(currentUserId)) return true;
    if (!personName) return false;
    if (!cleanName) return false;
    const cleanPerson = personName.toLowerCase().trim();
    return cleanPerson.includes(cleanName) || cleanName.includes(cleanPerson);
  }

  const isExplicitMaker = (Array.isArray(task.assignedMakerIds) && task.assignedMakerIds.includes(currentUserId)) ||
    isUserMatch(task.maker) || isUserMatch(task.assignedMakers?.join(', '));

  const isExplicitChecker = (Array.isArray(task.assignedCheckerIds) && task.assignedCheckerIds.includes(currentUserId)) ||
    isUserMatch(task.checker) || isUserMatch(task.assignedCheckers?.join(', '));

  const isLockedByOtherMaker = task.lockedMaker && !isUserMatch(task.lockedMaker) && !isAdmin;
  const isActionedByOtherChecker = task.lockedChecker && !isUserMatch(task.lockedChecker) && !isAdmin;

  // Separation of duties rule: If current non-admin user is the Maker who submitted this task, they cannot approve/reject it.
  const isSelfMakerSubmission = task.lockedMaker && isUserMatch(task.lockedMaker) && !isAdmin;

  // SOP Creator / Approver should see Edit Task Assignment button, but NOT Submit/Approve/Reject buttons (unless Admin)
  const isSopOnlyUser = (isSopCreator || isSopApprover) && !isAdmin;

  const canSubmit = (task.status === 'OPEN' || task.status === 'REJECTED') &&
    (isAdmin || (isExplicitMaker && !isSopOnlyUser)) &&
    !isLockedByOtherMaker;

  const canApproveOrReject = task.status === 'PENDING_REVIEW' &&
    (isAdmin || (isExplicitChecker && !isSopOnlyUser)) &&
    !isActionedByOtherChecker &&
    !isSelfMakerSubmission;

  const isReadOnly = !canSubmit && !canApproveOrReject;

  const isSubmittedOrDone = task.status === 'PENDING_REVIEW' || task.status === 'APPROVED' || task.status === 'REJECTED' || task.status === 'PERMANENTLY_REJECTED';

  async function handleReassignSubmit() {
    setToastError('');
    if (selectedMakerIds.length === 0 && selectedCheckerIds.length === 0) {
      setToastError('Please select at least one Maker or Checker for reassignment.');
      return;
    }
    try {
      setReassigning(true);
      const targetId = task.taskId || task.id || task.recordNo;
      const targetActor = currentUserId || 'usr-manoj-042';
      if (onReassignTask) {
        await onReassignTask(targetId, targetActor, selectedMakerIds, selectedCheckerIds, reassignReason);
      }
      setShowReassignSection(false);
    } catch (err) {
      setToastError(err.message || 'Task reassignment failed');
    } finally {
      setReassigning(false);
    }
  }

  const rawHistory = (task.history && task.history.length > 0) ? task.history : [];
  const hasCreate = rawHistory.some(h => (h.action || '').toUpperCase().includes('CREATE'));

  const effectiveHistory = hasCreate
    ? rawHistory
    : [
      {
        eventId: 0,
        action: 'CREATE_TASK',
        actorName: 'System Scheduler',
        fromStatus: null,
        toStatus: 'OPEN',
        comment: 'Compliance task cycle created automatically',
        timestamp: task.createdAt || new Date().toISOString(),
      },
      ...rawHistory,
    ];

  function triggerConfirm(actionType) {
    setToastError('');
    if (actionType === 'REJECT' && !comment.trim()) {
      setToastError('Please provide a mandatory reason for rejection.');
      return;
    }
    setPendingConfirm(actionType);
  }

  async function handleAction(actionType) {
    setToastError('');
    try {
      setSubmitting(true);
      const targetId = task.taskId || task.id || task.recordNo;
      const targetActor = currentUser?.id || currentUser?.userId || currentUser?.name || 'usr-tushar-304';

      if (actionType === 'SUBMIT') {
        await onSubmitTask(targetId, targetActor, comment);
      } else if (actionType === 'APPROVE') {
        await onApproveTask(targetId, targetActor, comment);
      } else if (actionType === 'REJECT') {
        if (!comment.trim()) {
          setToastError('Please provide a mandatory reason for rejection.');
          setSubmitting(false);
          setPendingConfirm(null);
          return;
        }
        const isPermanent = rejectionMode === 'permanent';
        await onRejectTask(targetId, targetActor, comment, isPermanent);
      }
      onClose();
    } catch (err) {
      setToastError(err.message || 'Action failed');
    } finally {
      setSubmitting(false);
      setPendingConfirm(null);
    }
  }

  const confirmProps = pendingConfirm === 'SUBMIT' ? {
    title: 'Confirm Task Submission?',
    message: 'Are you sure you want to submit this compliance task for review?',
    confirmText: 'Yes, Submit Task',
    confirmVariant: 'primary',
  } : pendingConfirm === 'APPROVE' ? {
    title: 'Confirm Task Approval?',
    message: 'Are you sure you want to approve this compliance task?',
    confirmText: 'Yes, Approve Task',
    confirmVariant: 'success',
  } : pendingConfirm === 'REJECT' ? {
    title: 'Reject Compliance Task',
    message: 'Please select how you wish to process this rejection:',
    confirmText: rejectionMode === 'permanent' ? 'Permanently Reject' : 'Reject & Return to Maker',
    confirmVariant: 'danger',
  } : null;

  return (
    <>
      <Toast message={toastError} type="error" duration={4500} onClose={() => setToastError('')} />

      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#091124]/65 p-6 backdrop-blur-md" onClick={onClose}>
        <div
          className="flex max-h-[88vh] w-full max-w-[780px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-[modalSlideIn_0.22s_cubic-bezier(0.16,1,0.3,1)]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/20">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Compliance Task Details</h3>
                <p className="mt-0.25 text-xs text-white/85">{task.record || task.recordNo} • {task.entity || task.entityName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* History / Activity Log Button */}
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-white/35 bg-white/18 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/30 hover:shadow-md"
                onClick={() => setShowActivityLogModal(true)}
                title="Open Task Activity Log & Audit Trail"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Activity Log</span>
                <span className="rounded-full bg-white px-1.5 py-0.25 text-[11px] font-bold text-blue-600">
                  {effectiveHistory.length}
                </span>
              </button>

              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/25 bg-white/15 text-white transition-all hover:bg-white/30"
                onClick={onClose}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="flex max-h-[68vh] flex-col gap-5 overflow-y-auto p-6">
            {/* Visual Task Lifecycle Progress Flow Diagram */}
            <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 px-4.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Task Status Lifecycle Flow
              </div>
              <div className="flex items-center justify-between gap-1.5">
                {/* Step 1: Created / Open */}
                <div className="flex flex-1 items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    1
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-semibold text-slate-800">Task Created</span>
                    <span className="text-[11px] text-slate-500">Open for Maker</span>
                  </div>
                </div>

                <div className={`h-[2px] flex-[0.4] mx-0.5 ${task.status !== 'OPEN' ? 'bg-blue-600' : 'bg-slate-200'}`} />

                {/* Step 2: Maker Submission */}
                <div className="flex flex-1 items-center gap-2">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${task.status !== 'OPEN'
                    ? (task.status === 'PENDING_REVIEW'
                      ? 'bg-amber-600 text-white ring-4 ring-amber-600/20'
                      : 'bg-blue-600 text-white')
                    : 'bg-slate-300 text-slate-600'
                    }`}>
                    2
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-semibold text-slate-800">
                      {task.lockedMaker ? `Submitted by ${task.lockedMaker}` : 'Maker Submission'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {task.status === 'OPEN' ? 'Awaiting Maker' : task.status === 'PENDING_REVIEW' ? 'Pending Review' : 'Submitted'}
                    </span>
                  </div>
                </div>

                <div className={`h-[2px] flex-[0.4] mx-0.5 ${['APPROVED', 'REJECTED', 'PERMANENTLY_REJECTED'].includes(task.status) ? 'bg-blue-600' : 'bg-slate-200'}`} />

                {/* Step 3: Checker Outcome */}
                <div className="flex flex-1 items-center gap-2">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${task.status === 'APPROVED' ? 'bg-green-600 text-white' :
                    task.status === 'REJECTED' ? 'bg-red-600 text-white' :
                      task.status === 'PERMANENTLY_REJECTED' ? 'bg-red-900 text-white' :
                        'bg-slate-300 text-slate-600'
                    }`}>
                    {task.status === 'APPROVED' ? '✓' : task.status === 'REJECTED' ? '↺' : task.status === 'PERMANENTLY_REJECTED' ? '✕' : '3'}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-semibold text-slate-800">
                      {task.status === 'APPROVED' ? `Approved by ${task.lockedChecker || 'Checker'}` :
                        task.status === 'REJECTED' ? `Returned by ${task.lockedChecker || 'Checker'}` :
                          task.status === 'PERMANENTLY_REJECTED' ? `Permanently Rejected by ${task.lockedChecker || 'Checker'}` :
                            'Checker Outcome'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {task.status === 'APPROVED' ? 'Lifecycle Complete' :
                        task.status === 'REJECTED' ? 'Resubmit Allowed' :
                          task.status === 'PERMANENTLY_REJECTED' ? 'Task Closed' :
                            'Pending Review'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Task Metadata Cards */}
            <div className="grid grid-cols-2 gap-3.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">SOP Procedure</span>
                <span className="text-[13.5px] font-bold text-slate-900">{task.sop || task.sopTitle}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Status</span>
                <div>
                  <StatusBadge status={task.status} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Entity &amp; Recurrence</span>
                <span className="text-xs text-slate-700">{task.entity || task.entityName} ({task.period || task.periodKey})</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Due Date</span>
                <span className="text-xs text-slate-700">{task.dueDate}</span>
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Assigned Maker Pool</span>
                <span className="text-xs text-slate-700">
                  {task.assignedMakers?.length ? task.assignedMakers.join(', ') : task.maker}
                  {task.lockedMaker && <strong className="ml-2 text-blue-600">(Locked by {task.lockedMaker})</strong>}
                </span>
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Assigned Checker Pool</span>
                <span className="text-xs text-slate-700">
                  {task.assignedCheckers?.length ? task.assignedCheckers.join(', ') : task.checker}
                  {task.lockedChecker && <strong className="ml-2 text-emerald-600">(Actioned by {task.lockedChecker})</strong>}
                </span>
              </div>
            </div>

            {/* Reassign Task Form Card (Expandable for SOP Creator, SOP Approver, Admin) */}
            {showReassignSection && canReassign && (
              <div className="flex flex-col gap-4 rounded-xl border border-amber-300 bg-amber-50/70 p-5 shadow-sm animate-[modalSlideIn_0.18s_ease-out]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    <strong className="text-xs font-bold uppercase tracking-wider">Reassign Task Assignments (Task-Specific Override)</strong>
                  </div>
                  <span className="rounded bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900">Parent SOP Template Unchanged</span>
                </div>

                <p className="text-xs text-amber-800">
                  Update assigned Makers or Checkers for <strong>this specific task cycle only</strong>. Only users with explicit Maker or Approver permissions are eligible. Previous assigned individuals and work timeline will be recorded in audit history.
                </p>

                <div className="flex flex-col gap-4 w-full">
                  {/* Maker Pool List */}
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <label className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">ASSIGNED MAKER POOL *</label>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 p-[5px_12px] rounded-[6px] bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] text-[12px] font-semibold cursor-pointer transition-all duration-150 hover:bg-[#dbeafe] hover:border-[#93c5fd] hover:text-[#1e40af]"
                        onClick={() => setShowMakerPicker(true)}
                      >
                        Select Makers ({selectedMakerIds.length})
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 bg-white border border-[#cbd5e1] rounded-[8px] p-[8px_12px] min-h-[42px] items-center box-border">
                      {selectedMakerIds.length === 0 ? (
                        <span className="text-[13px] text-[#94a3b8] italic">No Makers selected — click "Select Makers" to assign</span>
                      ) : (
                        selectedMakerIds.map(id => (
                          <div key={id} className="inline-flex items-center gap-1.5 p-[4px_8px_4px_10px] rounded-[16px] bg-[#f1f5f9] border border-[#cbd5e1] text-[#334155] text-[12px] font-semibold">
                            <span>{USER_ID_NAME_MAP[id] || id}</span>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-4 h-4 rounded-full border-none bg-[rgba(100,116,139,0.15)] text-[#64748b] cursor-pointer ml-0.5 p-0 transition-all duration-150 hover:bg-[#ef4444] hover:text-white"
                              onClick={() => setSelectedMakerIds(selectedMakerIds.filter(mId => mId !== id))}
                            >
                              &times;
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Checker Pool List */}
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <label className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">ASSIGNED CHECKER POOL *</label>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 p-[5px_12px] rounded-[6px] bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] text-[12px] font-semibold cursor-pointer transition-all duration-150 hover:bg-[#dbeafe] hover:border-[#93c5fd] hover:text-[#1e40af]"
                        onClick={() => setShowCheckerPicker(true)}
                      >
                        Select Checkers ({selectedCheckerIds.length})
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 bg-white border border-[#cbd5e1] rounded-[8px] p-[8px_12px] min-h-[42px] items-center box-border">
                      {selectedCheckerIds.length === 0 ? (
                        <span className="text-[13px] text-[#94a3b8] italic">No Checkers selected — click "Select Checkers" to assign</span>
                      ) : (
                        selectedCheckerIds.map(id => (
                          <div key={id} className="inline-flex items-center gap-1.5 p-[4px_8px_4px_10px] rounded-[16px] bg-[#f1f5f9] border border-[#cbd5e1] text-[#334155] text-[12px] font-semibold">
                            <span>{USER_ID_NAME_MAP[id] || id}</span>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-4 h-4 rounded-full border-none bg-[rgba(100,116,139,0.15)] text-[#64748b] cursor-pointer ml-0.5 p-0 transition-all duration-150 hover:bg-[#ef4444] hover:text-white"
                              onClick={() => setSelectedCheckerIds(selectedCheckerIds.filter(cId => cId !== id))}
                            >
                              &times;
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Reason Input */}
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <label className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">REASSIGNMENT REASON / WORK CONTINUITY CONTEXT</label>
                    <input
                      type="text"
                      placeholder="e.g. Previous Maker completed part of calculation, reassigning remaining work to Prayasa..."
                      value={reassignReason}
                      onChange={e => setReassignReason(e.target.value)}
                      className="w-full p-[10px_14px] rounded-[8px] border border-[#cbd5e1] bg-white text-[13.5px] outline-none transition-all focus:border-[#2563eb]"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowReassignSection(false)}
                      className="px-4 py-2 rounded-[8px] border border-[#cbd5e1] bg-white text-[#475569] text-xs font-semibold hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleReassignSubmit}
                      disabled={reassigning}
                      className="px-5 py-2 rounded-[8px] bg-[#2563eb] text-white text-xs font-semibold shadow-sm hover:bg-[#1d4ed8] disabled:opacity-60"
                    >
                      {reassigning ? 'Saving Reassignment...' : 'Confirm Task Reassignment'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Task Reassignment History & Continuity Track Card */}
            {task.reassignmentHistory && task.reassignmentHistory.length > 0 && (
              <div className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                <div className="flex items-center gap-2 text-indigo-900">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8v4l3 3" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  <strong className="text-xs font-bold uppercase tracking-wider">Task Reassignment &amp; Work Continuity Track</strong>
                  <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                    {task.reassignmentHistory.length} Record{task.reassignmentHistory.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {task.reassignmentHistory.map((r, idx) => (
                    <div key={r.id || idx} className="flex flex-col gap-1.5 rounded-lg border border-indigo-100 bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-slate-700">
                        <div className="flex items-center gap-1.5 font-semibold text-indigo-900">
                          <span className="inline-block h-2 w-2 rounded-full bg-indigo-600"></span>
                          Reassigned by {r.actorName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          Worked Until: <strong>{r.workedUntil ? new Date(r.workedUntil).toLocaleString() : new Date(r.reassignedAt).toLocaleString()}</strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-800 bg-slate-50 p-2 rounded border border-slate-100">
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 block">Previous Maker(s):</span>
                          <span className="line-through text-slate-500">{r.previousMakerNames?.length ? r.previousMakerNames.join(', ') : 'None'}</span>
                          <span className="text-indigo-700 font-semibold block mt-0.5">&rarr; New: {r.newMakerNames?.length ? r.newMakerNames.join(', ') : 'None'}</span>
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 block">Previous Checker(s):</span>
                          <span className="line-through text-slate-500">{r.previousCheckerNames?.length ? r.previousCheckerNames.join(', ') : 'None'}</span>
                          <span className="text-indigo-700 font-semibold block mt-0.5">&rarr; New: {r.newCheckerNames?.length ? r.newCheckerNames.join(', ') : 'None'}</span>
                        </div>
                      </div>

                      {r.reason && (
                        <div className="text-[11.5px] italic text-slate-600 bg-amber-50/60 border border-amber-200/60 p-1.5 px-2.5 rounded mt-0.5">
                          Note: "{r.reason}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Task Attachments & Evidence (GCS Cloud Storage) Card */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  <strong className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Task Documents &amp; Working Papers (GCS Storage)
                  </strong>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                    {documents.length} File{documents.length === 1 ? '' : 's'}
                  </span>
                </div>

                {(isAdmin || isSopCreator || isSopApprover || isExplicitMaker || isExplicitChecker) && (
                  <label className={`inline-flex items-center gap-1.5 rounded-lg border border-blue-600/30 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 cursor-pointer hover:bg-blue-100 transition-all ${uploadingDoc ? 'opacity-60 pointer-events-none' : ''}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>{uploadingDoc ? 'Uploading to GCS...' : 'Upload Document'}</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploadingDoc}
                    />
                  </label>
                )}
              </div>

              {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 mb-1">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <p className="text-xs text-slate-500 font-medium">No documents attached yet.</p>
                  {(isAdmin || isSopCreator || isSopApprover || isExplicitMaker || isExplicitChecker) && (
                    <p className="text-[11px] text-slate-400 mt-0.5">Click 'Upload Document' above to attach proof or working papers (PDF, Excel, Word, images up to 25MB).</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {documents.map((doc) => {
                    const badge = getFileBadgeStyle(doc.fileName);
                    const canDelete = isAdmin || (doc.uploadedById && doc.uploadedById.toLowerCase() === currentUserId.toLowerCase());
                    const downloadUrl = getTaskDocumentDownloadUrl(task.taskId || task.id, doc.documentId, currentUserId);

                    return (
                      <div key={doc.documentId} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 px-3 shadow-2xs hover:border-slate-300 transition-all">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className={`inline-flex items-center justify-center px-2 py-1 text-[10px] font-bold rounded border uppercase tracking-wider ${badge.bg}`}>
                            {badge.icon}
                          </span>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-semibold text-slate-800 truncate" title={doc.fileName}>
                              {doc.fileName}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {formatFileSize(doc.fileSize)} • Uploaded by <strong className="text-slate-700">{doc.uploadedByName || doc.uploadedById || 'User'}</strong>
                              {doc.uploadedAt ? ` on ${new Date(doc.uploadedAt).toLocaleString()}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={downloadUrl}
                            download={doc.fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1 text-[11.5px] font-semibold text-slate-700 transition-all border border-slate-200"
                            title="Download Document via Secure Proxy"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span>Download</span>
                          </a>

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDocumentDelete(doc.documentId)}
                              disabled={deletingDocId === doc.documentId}
                              className="inline-flex items-center gap-1 rounded-md bg-rose-50 hover:bg-rose-100 px-2 py-1 text-[11.5px] font-semibold text-rose-700 transition-all border border-rose-200 disabled:opacity-50"
                              title="Delete Document"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              <span>{deletingDocId === doc.documentId ? '...' : 'Delete'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Execution Comments Section */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-800">
                Execution Notes &amp; Audit Comments
              </label>
              <textarea
                className="min-h-[90px] w-full resize-y rounded-xl border border-slate-300 bg-white p-3 px-3.5 text-[13.5px] text-slate-900 outline-none transition-all focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 disabled:bg-slate-100 disabled:text-slate-400"
                rows="3"
                placeholder={
                  isReadOnly
                    ? (isSelfMakerSubmission
                      ? 'Read-only: You submitted this task as Maker (Segregation of Duties)'
                      : 'Read-only viewer mode...')
                    : canApproveOrReject
                      ? 'Enter approval notes or mandatory rejection reason...'
                      : 'Enter task execution summary, tax deposit reference, or upload comments...'
                }
                value={comment}
                onChange={e => setComment(e.target.value)}
                disabled={isReadOnly}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
              onClick={onClose}
            >
              Close
            </button>

            <div className="flex items-center gap-2.5">
              {/* Edit Task Assignment Button in Footer beside Submit */}
              {canReassign && (
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.75 rounded-lg border px-4 py-2 text-xs font-semibold transition-all shadow-sm ${
                    showReassignSection
                      ? 'border-amber-400 bg-amber-500 text-white'
                      : 'border-amber-600/40 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                  onClick={() => setShowReassignSection(!showReassignSection)}
                  title="Reassign Task (SOP Creator, SOP Approver, or Admin)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <polyline points="17 11 19 13 23 9" />
                  </svg>
                  <span>{showReassignSection ? 'Close Edit' : 'Edit Task Assignment'}</span>
                </button>
              )}

              {!showReassignSection && canSubmit && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.75 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)] transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => triggerConfirm('SUBMIT')}
                  disabled={submitting}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span>{submitting ? 'Submitting...' : task.status === 'REJECTED' ? 'Resubmit Task' : 'Submit for Review'}</span>
                </button>
              )}

              {!showReassignSection && canApproveOrReject && (
                <>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.75 rounded-lg border border-red-600/30 bg-white px-5 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-600/8 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => triggerConfirm('REJECT')}
                    disabled={submitting}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>Reject Task</span>
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1.75 rounded-lg bg-green-600 px-5 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(22,163,74,0.3)] transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => triggerConfirm('APPROVE')}
                    disabled={submitting}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Approve Task</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Pickers for Task Maker / Checker Pool Selection */}
      <UserPickerModal
        isOpen={showMakerPicker}
        title="Select Eligible Makers for Task"
        entityCode={task.entityCode}
        targetRole="MAKER"
        selectedUserIds={selectedMakerIds}
        permittedUsers={permittedMakers}
        onClose={() => setShowMakerPicker(false)}
        onConfirm={ids => {
          setSelectedMakerIds(ids);
          setShowMakerPicker(false);
        }}
      />

      <UserPickerModal
        isOpen={showCheckerPicker}
        title="Select Eligible Checkers for Task"
        entityCode={task.entityCode}
        targetRole="CHECKER"
        selectedUserIds={selectedCheckerIds}
        permittedUsers={permittedCheckers}
        onClose={() => setShowCheckerPicker(false)}
        onConfirm={ids => {
          setSelectedCheckerIds(ids);
          setShowCheckerPicker(false);
        }}
      />

      {/* Standalone Dedicated Activity Log Modal */}
      <TaskActivityLogModal
        isOpen={showActivityLogModal}
        onClose={() => setShowActivityLogModal(false)}
        task={{
          ...task,
          history: effectiveHistory,
        }}
      />

      {/* Confirmation Dialog Popup */}
      {confirmProps && (
        <ConfirmationModal
          isOpen={!!pendingConfirm}
          title={confirmProps.title}
          message={confirmProps.message}
          confirmText={confirmProps.confirmText}
          confirmVariant={confirmProps.confirmVariant}
          submitting={submitting}
          onConfirm={() => handleAction(pendingConfirm)}
          onClose={() => setPendingConfirm(null)}
        >
          {pendingConfirm === 'REJECT' && (
            <div className="w-full my-[14px] mb-[20px] text-left bg-[#f8fafc] border border-[#e2e8f0] p-4 rounded-[10px]">
              <span className="block text-[11px] font-bold text-text-muted uppercase tracking-[0.04em] mb-2.5">
                Select Action Mode:
              </span>
              <div className="flex flex-col gap-2.5">
                <label
                  className={`flex items-start gap-3 p-3 rounded-[8px] border cursor-pointer transition-all duration-150 ${rejectionMode === 'resubmit'
                      ? 'bg-[#eff6ff] border-[#2563eb] text-[#1e40af] shadow-sm'
                      : 'bg-bg-surface border-[#cbd5e1] text-[#334155] hover:border-[#94a3b8]'
                    }`}
                >
                  <input
                    type="radio"
                    name="rejectionMode"
                    value="resubmit"
                    checked={rejectionMode === 'resubmit'}
                    onChange={() => setRejectionMode('resubmit')}
                    className="mt-1 h-4 w-4 text-[#2563eb] border-[#cbd5e1] focus:ring-[#2563eb] cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <strong className="text-[13px] font-semibold leading-tight">
                      Return to Maker for Re-submission
                    </strong>
                    <p className="text-[12px] text-text-muted mt-0.5 leading-normal">
                      Sends task back to Maker pool so evidence/notes can be corrected and submitted again
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-[8px] border cursor-pointer transition-all duration-150 ${rejectionMode === 'permanent'
                      ? 'bg-[#fff1f2] border-[#dc2626] text-[#9f1239] shadow-sm'
                      : 'bg-bg-surface border-[#cbd5e1] text-[#334155] hover:border-[#94a3b8]'
                    }`}
                >
                  <input
                    type="radio"
                    name="rejectionMode"
                    value="permanent"
                    checked={rejectionMode === 'permanent'}
                    onChange={() => setRejectionMode('permanent')}
                    className="mt-1 h-4 w-4 text-[#dc2626] border-[#cbd5e1] focus:ring-[#dc2626] cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <strong className="text-[13px] font-semibold leading-tight text-[#dc2626]">
                      Permanently Reject Task
                    </strong>
                    <p className="text-[12px] text-text-muted mt-0.5 leading-normal">
                      Closes task lifecycle permanently - no further submissions or changes allowed
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </ConfirmationModal>
      )}
    </>
  );
}
