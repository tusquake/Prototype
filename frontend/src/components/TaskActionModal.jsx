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
      setUploadingFile(false);
      setUploadProgressMsg('');
      setIsDragging(false);
      const tId = task.taskId || task.id;
      loadDocuments(tId);
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

  const hasUnapprovedDocs = documents.length > 0 && documents.some(d => d.status !== 'APPROVED');

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

  function triggerConfirm(actionType) {
    setToastError('');
    if (actionType === 'APPROVE' && hasUnapprovedDocs) {
      setToastError('Task cannot be approved until all attached evidence documents are individually approved (✓) by the Checker.');
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
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Start Date</span>
                <span className="text-xs font-semibold text-slate-800">{task.startDate || (task.startDateTime ? String(task.startDateTime).slice(0, 10) : 'N/A')}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Due Date</span>
                <span className="text-xs font-semibold text-slate-800">{task.dueDate || (task.dueDateTime ? String(task.dueDateTime).slice(0, 10) : 'N/A')}</span>
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

            {/* Attached Working Papers & Evidence Documents Section with Drag & Drop */}
            <div
              className={`relative flex flex-col gap-3 rounded-xl border p-4 transition-all ${
                isDragging && canSubmit
                  ? 'border-blue-500 bg-blue-50/80 ring-4 ring-blue-500/20 shadow-md'
                  : 'border-slate-200 bg-slate-50'
              }`}
              onDragOver={canSubmit ? handleDragOver : undefined}
              onDragLeave={canSubmit ? handleDragLeave : undefined}
              onDrop={canSubmit ? handleDrop : undefined}
            >
              {/* Drag Overlay Notice */}
              {isDragging && canSubmit && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-blue-600/90 text-white backdrop-blur-xs animate-[fadeIn_0.15s_ease-in-out]">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className="mt-2 text-sm font-bold">Drop files here to upload instantly to Cloud Storage</span>
                  <span className="text-xs text-white/80">Supports multiple document attachments</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-800">
                    Attached Working Papers &amp; Evidence Documents
                  </span>
                  <span className="rounded-full bg-blue-600 px-2 py-0.25 text-[11px] font-bold text-white">
                    {documents.length}
                  </span>
                </div>

                {canSubmit && (
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-600/30 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-all hover:bg-blue-100 disabled:opacity-50">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>{uploadingFile ? 'Uploading...' : 'Attach File(s)'}</span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      disabled={uploadingFile}
                      onChange={e => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleAutoUploadFiles(e.target.files);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Real-time Upload Progress Indicator */}
              {uploadingFile && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-300 bg-blue-50 p-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <span className="text-xs font-semibold text-blue-900">{uploadProgressMsg || 'Uploading file to storage...'}</span>
                  </div>
                </div>
              )}

              {/* Task Revision Mode Alert Callout */}
              {task.status === 'REJECTED' && canSubmit && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-900 shadow-xs">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mt-0.5 shrink-0 text-amber-600">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <div>
                    <strong className="font-bold text-amber-950">Task Re-submission Mode:</strong> This task was returned for revision by the Checker. You can drag and drop or attach new evidence documents in place of rejected attachments. Newly uploaded documents will be tagged as <span className="font-bold text-indigo-700">Re-submitted</span>.
                  </div>
                </div>
              )}

              {/* Task Approval Gating Warning Callout */}
              {canApproveOrReject && hasUnapprovedDocs && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 shadow-xs">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mt-0.5 shrink-0 text-amber-600">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <div>
                    <strong className="font-bold text-amber-950">Document Review Gating:</strong> All attached evidence documents must be individually reviewed and marked as Approved (<span className="font-bold text-emerald-700">✓</span>) by the Checker before this compliance task can be approved.
                  </div>
                </div>
              )}

              {/* Document List */}
              {loadingDocs ? (
                <div className="py-4 text-center text-xs text-slate-500">Loading attached documents...</div>
              ) : documents.length === 0 ? (
                canSubmit ? (
                  <div
                    className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 p-6 text-center transition-all hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer"
                    onClick={() => {
                      const el = document.querySelector('input[type="file"][multiple]');
                      if (el) el.click();
                    }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-xs font-semibold text-slate-700">No documents attached yet</span>
                    <span className="text-[11px] text-slate-500 mt-0.5">Drag &amp; drop evidence files here or click to browse</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-6 text-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="text-xs font-semibold text-slate-700">No documents attached yet</span>
                    <span className="text-[11px] text-slate-500 mt-0.5">No evidence documents have been uploaded for this task</span>
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-2">
                  {documents.map(doc => (
                    <div
                      key={doc.documentId}
                      className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2.5 px-3 transition-all hover:border-slate-300 hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-blue-600">
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

                              {/* Document Review Status Badges */}
                              {doc.status === 'APPROVED' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800" title={doc.actionedByName ? `Approved by ${doc.actionedByName}` : 'Approved'}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  <span>Approved</span>
                                </span>
                              ) : doc.status === 'REJECTED' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10.5px] font-bold text-rose-800" title={doc.rejectionReason ? `Reason: ${doc.rejectionReason}` : 'Rejected'}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                  <span>Rejected</span>
                                </span>
                              ) : doc.isResubmission ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10.5px] font-bold text-indigo-800" title="Re-submitted evidence file in place of rejected document">
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="23 4 23 10 17 10" />
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                  </svg>
                                  <span>Re-submitted</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold text-amber-800">
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                  </svg>
                                  <span>Pending Review</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                              <span>{formatFileSize(doc.fileSize)}</span>
                              <span>•</span>
                              <span>By {doc.uploadedByName || doc.uploadedById || 'User'}</span>
                              {doc.uploadedAt && (
                                <>
                                  <span>•</span>
                                  <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Checker Approve (✓) / Reject (✕) Actions — Hidden on REJECTED documents */}
                          {canApproveOrReject && doc.status !== 'REJECTED' && (
                            <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2 mr-1">
                              <button
                                type="button"
                                className={`flex h-7 px-2 items-center justify-center gap-1 rounded-md text-xs font-bold transition-all ${
                                  doc.status === 'APPROVED'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-300'
                                }`}
                                onClick={() => handleDocumentAction(doc, 'APPROVE')}
                                disabled={actioningDocId === doc.documentId}
                                title="Approve Document (✓)"
                              >
                                <span>✓</span>
                                <span className="text-[11px]">Approve</span>
                              </button>
                              <button
                                type="button"
                                className={`flex h-7 px-2 items-center justify-center gap-1 rounded-md text-xs font-bold transition-all ${
                                  doc.status === 'REJECTED'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-300'
                                }`}
                                onClick={() => {
                                  setRejectingDoc(doc);
                                  setDocRejectionReason('');
                                }}
                                disabled={actioningDocId === doc.documentId}
                                title="Reject Document (✕)"
                              >
                                <span>✕</span>
                                <span className="text-[11px]">Reject</span>
                              </button>
                            </div>
                          )}

                          {/* View Button (Eye Icon) */}
                          <button
                            type="button"
                            className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all"
                            onClick={() => handleViewDocument(doc)}
                            disabled={downloadingDocId === doc.documentId}
                            title="View document directly in browser tab"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span>View</span>
                          </button>

                          {/* Download Button (Arrow Icon) */}
                          <button
                            type="button"
                            className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all"
                            onClick={() => handleDownload(doc)}
                            disabled={downloadingDocId === doc.documentId}
                            title="Download document file attachment"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span>Download</span>
                          </button>

                          {/* Delete button (Hidden on APPROVED and REJECTED documents) */}
                          {canSubmit && doc.status !== 'APPROVED' && doc.status !== 'REJECTED' && (
                            <button
                              type="button"
                              className="flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"
                              onClick={() => handleDeleteDocument(doc)}
                              disabled={deletingDocId === doc.documentId}
                              title="Delete document attachment"
                            >
                              {deletingDocId === doc.documentId ? (
                                <svg className="h-3.5 w-3.5 animate-spin text-red-600" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                              ) : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Rejection Note Display */}
                      {doc.status === 'REJECTED' && doc.rejectionReason && (
                        <div className="flex items-start gap-1.5 rounded-md bg-rose-50 p-2 text-[11.5px] text-rose-800 border border-rose-200">
                          <strong className="shrink-0 font-bold">Rejection Reason:</strong>
                          <span>{doc.rejectionReason}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                        className={`flex flex-col gap-1.5 rounded-lg border p-3 text-xs transition-all ${
                          isReject
                            ? 'border-rose-200 bg-rose-50/80 text-rose-950'
                            : isApproverEvent
                            ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
                            : 'border-blue-200 bg-blue-50/80 text-blue-950'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                              isReject
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
