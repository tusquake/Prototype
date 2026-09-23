import { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import ConfirmationModal from './ConfirmationModal';
import TaskActivityLogModal from './TaskActivityLogModal';
import Toast from './Toast';
import {
  getTaskDocuments,
  generateUploadUrl,
  uploadFileToSignedUrl,
  confirmTaskDocumentUpload,
  generateDownloadUrl,
  deleteTaskDocument,
  actionTaskDocument,
} from '../services/api';
import dayjs from 'dayjs';

function formatDate(date, formatConfig = 'DD MMM YYYY') {
  if (!date) return 'Invalid Date'
  return dayjs(date).format(formatConfig)
}

export default function TaskActionModal({
  isOpen,
  task,
  currentUser,
  onClose,
  onSubmitTask,
  onApproveTask,
  onRejectTask,
}) {
  const [comment, setComment] = useState('');
  const [toastError, setToastError] = useState('');
  const [toastSuccess, setToastSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(null); // 'SUBMIT' | 'APPROVE' | 'REJECT'
  const [rejectionMode, setRejectionMode] = useState('resubmit'); // 'resubmit' | 'permanent'
  const [showHistory, setShowHistory] = useState(true);
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);
  const [showMissingDocsModal, setShowMissingDocsModal] = useState(false);

  // Document management state
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [downloadingDocId, setDownloadingDocId] = useState(null);
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [actioningDocId, setActioningDocId] = useState(null);
  const [rejectingDoc, setRejectingDoc] = useState(null);
  const [docRejectionReason, setDocRejectionReason] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDocIdx, setSelectedDocIdx] = useState(0);

  async function loadDocuments(targetTaskId) {
    const tId = targetTaskId || task?.taskId || task?.id;
    if (!tId) return;
    setLoadingDocs(true);
    try {
      const docs = await getTaskDocuments(tId);
      setDocuments(docs || []);
    } catch (err) {
      console.warn('Failed to fetch task documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  }

  useEffect(() => {
    if (isOpen && task) {
      setComment('');
      setToastError('');
      setToastSuccess('');
      setPendingConfirm(null);
      setRejectionMode('resubmit');
      setShowHistory(true);
      setShowActivityLogModal(false);
      setShowMissingDocsModal(false);
      setUploadingFile(false);
      setUploadProgressMsg('');
      setIsDragging(false);
      const tId = task.taskId || task.id;
      loadDocuments(tId);
      setSelectedDocIdx(task?.requiredDocuments[0].requiredDocumentId)
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  async function handleAutoUploadFiles(files) {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const tId = task.taskId || task.id;
    const actorId = currentUser?.id || currentUser?.userId || 'usr-tushar-304';
    const isTaskRejected = task.status === 'REJECTED';

    setUploadingFile(true);
    setToastError('');
    setToastSuccess('');

    let successCount = 0;
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgressMsg(`Uploading file ${i + 1} of ${fileArray.length}: "${file.name}"...`);
      try {
        const uploadRes = await generateUploadUrl(
          tId,
          file.name,
          file.type || 'application/octet-stream',
          file.size,
          actorId
        );

        if (!uploadRes || !uploadRes.uploadUrl) {
          throw new Error(`Failed to generate upload URL for ${file.name}`);
        }

        const { uploadUrl, gcsObjectPath } = uploadRes;
        await uploadFileToSignedUrl(uploadUrl, file, file.type);

        await confirmTaskDocumentUpload(tId, {
          fileName: file.name,
          gcsObjectPath,
          fileSize: file.size,
          contentType: file.type || 'application/octet-stream',
          actorId,
          isResubmission: isTaskRejected,
          requiredDocumentId: selectedDocIdx || null
        });

        successCount++;
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err);
        setToastError(`Failed to upload ${file.name}: ${err.message}`);
      }
    }

    if (successCount > 0) {
      setToastSuccess(`Successfully uploaded ${successCount} document${successCount > 1 ? 's' : ''}!`);
      await loadDocuments(tId);
    }
    setUploadingFile(false);
    setUploadProgressMsg('');
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (canSubmit && !uploadingFile) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!canSubmit || uploadingFile) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAutoUploadFiles(e.dataTransfer.files);
    }
  }

  async function handleViewDocument(doc) {
    const tId = task.taskId || task.id;
    const actorId = currentUser?.id || currentUser?.userId || 'usr-tushar-304';

    setDownloadingDocId(doc.documentId);
    setToastError('');
    try {
      const downloadRes = await generateDownloadUrl(tId, doc.documentId, actorId);
      if (downloadRes && downloadRes.downloadUrl) {
        window.open(downloadRes.downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('Failed to obtain view URL');
      }
    } catch (err) {
      setToastError(err.message || 'Access Denied: You do not have permission to view this document');
    } finally {
      setDownloadingDocId(null);
    }
  }

  async function handleDownload(doc) {
    const tId = task.taskId || task.id;
    const actorId = currentUser?.id || currentUser?.userId || 'usr-tushar-304';

    setDownloadingDocId(doc.documentId);
    setToastError('');
    try {
      const downloadRes = await generateDownloadUrl(tId, doc.documentId, actorId);
      if (downloadRes && downloadRes.downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadRes.downloadUrl;
        link.download = doc.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('Failed to obtain download URL');
      }
    } catch (err) {
      setToastError(err.message || 'Access Denied: You do not have permission to download this document');
    } finally {
      setDownloadingDocId(null);
    }
  }

  async function handleDeleteDocument(doc) {
    const tId = task.taskId || task.id;
    const actorId = currentUser?.id || currentUser?.userId || 'usr-tushar-304';

    setDeletingDocId(doc.documentId);
    setToastError('');
    setToastSuccess('');
    try {
      await deleteTaskDocument(tId, doc.documentId, actorId);
      setToastSuccess(`Document "${doc.fileName}" deleted.`);
      await loadDocuments(tId);
    } catch (err) {
      setToastError(err.message || 'Failed to delete document');
    } finally {
      setDeletingDocId(null);
    }
  }

  async function handleDocumentAction(doc, action, reasonComment) {
    const tId = task.taskId || task.id;
    const actorId = currentUser?.id || currentUser?.userId || 'usr-tushar-304';
    setActioningDocId(doc.documentId);
    setToastError('');
    setToastSuccess('');
    try {
      await actionTaskDocument(tId, doc.documentId, action, reasonComment, actorId);
      setToastSuccess(`Document "${doc.fileName}" ${action === 'APPROVE' ? 'approved ✓' : 'rejected ✕'}`);
      setRejectingDoc(null);
      setDocRejectionReason('');
      await loadDocuments(tId);
    } catch (err) {
      setToastError(err.message || `Failed to ${action.toLowerCase()} document`);
    } finally {
      setActioningDocId(null);
    }
  }

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Authorization permissions driven 100% dynamically from the backend API:
  // - task.canUserSubmit: computed based on maker assignment, write-access reporting hierarchy, and status
  // - task.canUserApprove: computed based on checker assignment, read/write reporting hierarchy, status, and segregation of duties
  const canSubmit = task.status !== 'PERMANENTLY_REJECTED' && task.status !== 'APPROVED' && task.status !== 'PENDING_REVIEW' && (
    task.canUserSubmit !== undefined
      ? Boolean(task.canUserSubmit)
      : (task.status === 'OPEN' || task.status === 'REJECTED')
  );

  const canApproveOrReject = task.status === 'PENDING_REVIEW' && (
    task.canUserApprove !== undefined
      ? Boolean(task.canUserApprove)
      : true
  );

  const isReadOnly = !canSubmit && !canApproveOrReject;

  const hasUnapprovedDocs = documents.length > 0 && documents.some(d => d.status !== 'APPROVED' && d.status !== 'REJECTED');

  const isSubmittedOrDone = task.status === 'PENDING_REVIEW' || task.status === 'APPROVED' || task.status === 'REJECTED' || task.status === 'PERMANENTLY_REJECTED';

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

  const activityComments = effectiveHistory.filter(h => {
    if (!h.comment || !h.comment.trim()) return false;
    const act = (h.action || '').toUpperCase();
    const commentLower = h.comment.toLowerCase();
    const actorLower = (h.actorName || '').toLowerCase();

    // Exclude System Scheduler & Automated Creation events
    if (actorLower.includes('scheduler') || act.includes('CREATE') || commentLower.includes('created automatically') || commentLower.includes('compliance task cycle')) {
      return false;
    }

    // Exclude Document-level events (uploads, doc approvals, doc rejections, doc deletions)
    if (act.includes('DOCUMENT') || commentLower.includes('evidence file') || commentLower.includes('uploaded evidence') || commentLower.includes('approved evidence') || commentLower.includes('rejected evidence') || commentLower.includes('deleted evidence')) {
      return false;
    }

    return true;
  });

  const requiredDocs = task?.requiredDocuments || [];
  const validUploadedDocs = documents.filter(d => d.status !== 'REJECTED');
  const requiredCount = requiredDocs.length;
  const uploadedCount = validUploadedDocs.length;
  const isMissingDocs = requiredCount > 0 && uploadedCount < requiredCount;

  function triggerConfirm(actionType) {
    setToastError('');
    if (actionType === 'SUBMIT' && isMissingDocs) {
      setShowMissingDocsModal(true);
      return;
    }
    if (actionType === 'APPROVE' && hasUnapprovedDocs) {
      setToastError('Task cannot be approved until all attached evidence documents are individually approved by the Checker.');
      return;
    }
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
      <Toast message={toastSuccess} type="success" duration={3500} onClose={() => setToastSuccess('')} />

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
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">SOP</span>
                <span className="text-[13.5px] font-bold text-slate-900">{task.sop || task.sopTitle}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Status</span>
                <div>
                  <StatusBadge status={task.status} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Start Date</span>
                <span className="text-xs font-semibold text-slate-800">{task.startDate || (task.startDateTime ? String(task.startDateTime).slice(0, 10) : 'N/A')}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Due Date</span>
                <span className="text-xs font-semibold text-slate-800">{formatDate(task.dueDate)}</span>
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

            {/* Global Warnings / Callouts */}
            <div className="flex flex-col gap-3 mb-4">
              {task.status === 'REJECTED' && canSubmit && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-900 shadow-xs">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mt-0.5 shrink-0 text-amber-600">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <strong className="font-bold text-amber-950">Task Re-submission Mode:</strong> This task was returned for revision. Upload new evidence documents in place of rejected attachments.
                  </div>
                </div>
              )}

              {canApproveOrReject && hasUnapprovedDocs && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 shadow-xs">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mt-0.5 shrink-0 text-amber-600">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <strong className="font-bold text-amber-950">Document Review Gating:</strong> All attached evidence documents must be individually marked as Approved (✓) by the Checker before task approval.
                  </div>
                </div>
              )}
            </div>

            {/* Two-Column Document Interface */}

            {task?.requiredDocuments?.length > 0 && <div className="flex flex-col md:flex-row gap-5">


              <div className="w-full md:w-1/3 flex flex-col gap-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                    Required Documents
                  </span>

                </div>

                <div className="flex flex-col gap-2">
                  {task.requiredDocuments?.map((doc, idx) => {
                    const docName = typeof doc === 'string' ? doc : (doc.name || doc.title || doc.documentName || 'Document');
                    const isSelected = selectedDocIdx === doc.requiredDocumentId;
                    const docId = doc.requiredDocumentId ?? '';

                    // NOTE: Replace this logic based on how you link uploaded files to requirements
                    const hasFiles = documents.some(d => d.requiredDocumentName === doc.requiredDocumentId || d.categoryId === doc.id);

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDocIdx(doc.requiredDocumentId)}
                        className={`flex flex-col border rounded-lg p-3 shadow-xs cursor-pointer transition-all ${isSelected
                          ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold flex items-center gap-2 truncate ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>
                            <span className={hasFiles ? 'text-emerald-500' : 'text-amber-500'}>📄</span>
                            {docName}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${hasFiles ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                            {hasFiles ? 'Attached' : 'Missing'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="w-full md:w-2/3 flex flex-col rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm">

                {(() => {
                  const activeReq = task.requiredDocuments?.find((t) => t.requiredDocumentId === selectedDocIdx);

                  if (!activeReq) return <div className="p-8 text-center text-slate-500 text-sm">Select a document from the left list.</div>;

                  const activeName = typeof activeReq === 'string' ? activeReq : (activeReq.name || activeReq.title || activeReq.documentName || 'Document');
                  const activeDesc = typeof activeReq === 'object' ? (activeReq.description || activeReq.desc || '') : '';

                  const activeUploadedDocs = documents.filter(d => d.requiredDocumentId === selectedDocIdx || d.requiredDocumentId === activeReq.requiredDocumentId);
                  console.log('Active', activeUploadedDocs)

                  return (
                    <>
                      {/* Header */}
                      <div className="bg-white border-b border-slate-200 p-2">
                        <h4 className="text-sm font-bold text-slate-800">{activeName}</h4>
                        {activeDesc && <p className="text-xs text-slate-500 mt-1">{activeDesc}</p>}
                      </div>

                      <div className="p-4 flex flex-col gap-5">
                        {/* 1. List of Uploaded Files for this Requirement */}
                        <div className="flex flex-col gap-2">
                          <h5 className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                            Uploaded Documents ({activeUploadedDocs.length})
                          </h5>

                          {loadingDocs ? (
                            <div className="py-4 text-center text-xs text-slate-500">Loading documents...</div>
                          ) : activeUploadedDocs.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
                              <span className="text-xs font-medium text-slate-500">No files uploaded for this document category yet.</span>
                            </div>
                          ) : (
                            activeUploadedDocs.map(doc => (
                              <div
                                key={doc.documentId}
                                className={`flex flex-col gap-2 rounded-lg border p-3 shadow-xs transition-colors ${doc.status === 'APPROVED' ? 'border-emerald-300 bg-emerald-50' :
                                  doc.status === 'REJECTED' ? 'border-rose-300 bg-rose-50' :
                                    doc.isResubmission ? 'border-indigo-300 bg-indigo-50' :
                                      'border-amber-300 bg-amber-50'
                                  }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    {/* File Icon - Changed to white bg to contrast with colored parent wrapper */}
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm text-slate-600">
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                      </svg>
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                      <div className="flex items-center gap-2">
                                        <span className="truncate text-xs font-semibold text-slate-800" title={doc.fileName}>
                                          {doc.fileName}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px] text-slate-600 mt-0.5">
                                        <span>{formatFileSize(doc.fileSize)}</span>
                                        <span>•</span>
                                        <span>By {doc.uploadedByName || doc.uploadedById || 'User'}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {/* Checker Approve/Reject Actions */}
                                    {canApproveOrReject && doc.status !== 'REJECTED' && (
                                      <div className="flex items-center gap-1 border-r border-slate-300/50 pr-2 mr-1">
                                        <button
                                          type="button"
                                          className={`flex h-6 px-1.5 items-center justify-center gap-1 rounded text-[10px] font-bold transition-all ${doc.status === 'APPROVED'
                                              ? 'bg-emerald-600 text-white shadow-sm'
                                              : doc.status === 'REJECTED' || actioningDocId === doc.documentId
                                                ? 'bg-slate-50 text-slate-400 border border-slate-200 opacity-50 cursor-not-allowed'
                                                : 'bg-white text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                                            }`}
                                          onClick={() => handleDocumentAction(doc, 'APPROVE')}
                                          disabled={actioningDocId === doc.documentId || doc.status === 'REJECTED'}
                                        >
                                          ✓
                                        </button>
                                        <button
                                          type="button"
                                          className={`flex h-6 px-1.5 items-center justify-center gap-1 rounded text-[10px] font-bold transition-all ${doc.status === 'REJECTED'
                                              ? 'bg-rose-600 text-white shadow-sm'
                                              : doc.status === 'APPROVED' || actioningDocId === doc.documentId
                                                ? 'bg-slate-50 text-slate-400 border border-slate-200 opacity-50 cursor-not-allowed'
                                                : 'bg-white text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200'
                                            }`}
                                          onClick={() => { setRejectingDoc(doc); setDocRejectionReason(''); }}
                                          disabled={actioningDocId === doc.documentId || doc.status === 'APPROVED'}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    )}

                                    {/* Action Buttons - Changed to white bg to contrast with colored parent wrapper */}
                                    <button type="button" className="p-1.5 rounded bg-white text-slate-600 hover:bg-blue-100 hover:text-blue-700 shadow-sm border border-black/5" onClick={() => handleViewDocument(doc)} title="View">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                    </button>
                                    <button type="button" className="p-1.5 rounded bg-white text-slate-600 hover:bg-blue-100 hover:text-blue-700 shadow-sm border border-black/5" onClick={() => handleDownload(doc)} title="Download">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                    </button>

                                    {canSubmit && doc.status !== 'APPROVED' && doc.status !== 'REJECTED' && (
                                      <button type="button" className="p-1.5 rounded bg-white text-slate-500 hover:bg-red-100 hover:text-red-700 shadow-sm border border-black/5" onClick={() => handleDeleteDocument(doc)} title="Delete">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Rejection Reason - Tweaked styling to fit inside the rose-colored wrapper */}
                                {doc.status === 'REJECTED' && doc.rejectionReason && (
                                  <div className="mt-1 flex items-start gap-1.5 rounded-md bg-white/60 p-2 text-[11px] text-rose-900 border border-white/50">
                                    <strong className="shrink-0 font-bold">Rejection Reason:</strong>
                                    <span>{doc.rejectionReason}</span>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        {/* 2. Upload Zone for this Requirement */}
                        {canSubmit && (
                          <div
                            className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all ${isDragging ? 'border-blue-500 bg-blue-50/80 ring-4 ring-blue-500/20' : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/30'
                              }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => {
                              // Pass the activeName to your drop handler so the uploaded file maps to this requirement
                              // handleDrop(e, activeName); 
                              handleDrop(e);
                            }}
                          >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <span className="text-xs font-semibold text-slate-700 mb-1">Drag & drop files to upload</span>
                            <span className="text-[10px] text-slate-500 mb-3">Upload evidence for: <strong className="text-slate-700">{activeName}</strong></span>

                            <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50">
                              {uploadingFile ? 'Uploading...' : 'Browse Files'}
                              <input
                                type="file"
                                multiple
                                className="hidden"
                                disabled={uploadingFile}
                                onChange={e => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    // Pass activeName/activeReq.id to your upload handler to link the file
                                    // handleAutoUploadFiles(e.target.files, activeName);
                                    handleAutoUploadFiles(e.target.files);
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </label>

                            {uploadingFile && (
                              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/90 backdrop-blur-sm">
                                <svg className="mb-2 h-6 w-6 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                                <span className="text-xs font-bold text-blue-900">{uploadProgressMsg || 'Uploading...'}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>}




            {/* Historical Submitter & Approver Remarks Section */}
            {activityComments.length > 0 && (
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-800">
                      Submitter &amp; Approver Remarks History
                    </span>
                    <span className="rounded-full bg-blue-600 px-2 py-0.25 text-[11px] font-bold text-white">
                      {activityComments.length}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 mt-1">
                  {activityComments.map((evt, i) => {
                    const act = (evt.action || '').toUpperCase();
                    const isApproverEvent = act.includes('APPROVE') || act.includes('REJECT');
                    const isReject = act.includes('REJECT');

                    return (
                      <div
                        key={evt.eventId || i}
                        className={`flex flex-col gap-1.5 rounded-lg border p-3 text-xs transition-all ${isReject
                          ? 'border-rose-200 bg-rose-50/80 text-rose-950'
                          : isApproverEvent
                            ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
                            : 'border-blue-200 bg-blue-50/80 text-blue-950'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${isReject
                              ? 'bg-rose-100 text-rose-800'
                              : isApproverEvent
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                              }`}>
                              {isReject ? 'Approver Rejection' : isApproverEvent ? 'Approver Approval' : 'Submitter Note'}
                            </span>
                            <span className="font-bold text-slate-800">{evt.actorName || 'User'}</span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-500">
                            {evt.timestamp ? new Date(evt.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                          </span>
                        </div>

                        <p className="mt-0.5 text-[13px] leading-relaxed italic text-slate-900 font-medium">
                          &ldquo;{evt.comment}&rdquo;
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Execution Comments Section (Only shown when user can take action) */}
            {!isReadOnly && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-800">
                  Execution Notes &amp; Audit Comments
                </label>

                <textarea
                  className="min-h-[90px] w-full resize-y rounded-xl border border-slate-300 bg-white p-3 px-3.5 text-[13.5px] text-slate-900 outline-none transition-all focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 disabled:bg-slate-100 disabled:text-slate-400"
                  rows="3"
                  placeholder={
                    canApproveOrReject
                      ? 'Enter approval notes or mandatory rejection reason...'
                      : 'Enter task execution summary, tax deposit reference, or upload comments...'
                  }
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
              </div>
            )}
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
              {canSubmit && (
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

              {canApproveOrReject && (
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

      {/* Document Rejection Reason Modal */}
      {rejectingDoc && (
        <ConfirmationModal
          isOpen={!!rejectingDoc}
          title={`Reject Attachment: ${rejectingDoc.fileName}`}
          message="Please specify the exact reason for rejecting this evidence document:"
          confirmText="Reject Document"
          confirmVariant="danger"
          submitting={actioningDocId === rejectingDoc.documentId}
          onConfirm={() => {
            if (!docRejectionReason.trim()) {
              setToastError('Please enter a mandatory rejection reason for the document.');
              return;
            }
            handleDocumentAction(rejectingDoc, 'REJECT', docRejectionReason);
          }}
          onClose={() => {
            setRejectingDoc(null);
            setDocRejectionReason('');
          }}
        >
          <div className="w-full my-3 text-left">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Rejection Feedback for Maker
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/15"
              rows="3"
              placeholder="Provide specific notes (e.g., 'Bank stamp missing on page 2', 'Invalid date range')..."
              value={docRejectionReason}
              onChange={e => setDocRejectionReason(e.target.value)}
            />
          </div>
        </ConfirmationModal>
      )}
    </>
  );
}
