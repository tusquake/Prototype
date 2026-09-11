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
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [downloadingDocId, setDownloadingDocId] = useState(null);
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [actioningDocId, setActioningDocId] = useState(null);
  const [rejectingDoc, setRejectingDoc] = useState(null);
  const [docRejectionReason, setDocRejectionReason] = useState('');

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
      setSelectedFile(null);
      setUploadingFile(false);
      setUploadProgressMsg('');
      const tId = task.taskId || task.id;
      loadDocuments(tId);
    }
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  async function handleFileUpload() {
    if (!selectedFile) return;
    const tId = task.taskId || task.id;
    const actorId = currentUser?.id || currentUser?.userId || 'usr-tushar-304';

    setUploadingFile(true);
    setToastError('');
    setToastSuccess('');
    setUploadProgressMsg('Generating V4 Signed URL...');

    try {
      // 1. Get 15-min PUT Signed URL from backend
      const uploadRes = await generateUploadUrl(
        tId,
        selectedFile.name,
        selectedFile.type || 'application/octet-stream',
        selectedFile.size,
        actorId
      );

      if (!uploadRes || !uploadRes.uploadUrl) {
        throw new Error('Backend failed to issue Signed Upload URL');
      }

      const { uploadUrl, gcsObjectPath } = uploadRes;

      // 2. Direct upload raw file bytes to GCS / MinIO S3 object storage
      setUploadProgressMsg('Uploading file directly to Cloud Storage...');
      await uploadFileToSignedUrl(uploadUrl, selectedFile, selectedFile.type);

      // 3. Confirm upload & save DB metadata + SLA tag
      setUploadProgressMsg('Saving document metadata & SLA timing...');
      await confirmTaskDocumentUpload(tId, {
        fileName: selectedFile.name,
        gcsObjectPath,
        fileSize: selectedFile.size,
        contentType: selectedFile.type || 'application/octet-stream',
        actorId,
      });

      setToastSuccess(`File "${selectedFile.name}" uploaded successfully!`);
      setSelectedFile(null);
      await loadDocuments(tId);
    } catch (err) {
      setToastError(err.message || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
      setUploadProgressMsg('');
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
        window.open(downloadRes.downloadUrl, '_blank');
      } else {
        throw new Error('Failed to obtain download URL');
      }
    } catch (err) {
      setToastError(err.message || 'Access Denied: You do not have permission to view this document');
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
  const canSubmit = task.canUserSubmit !== undefined
    ? Boolean(task.canUserSubmit)
    : (task.status === 'OPEN' || task.status === 'REJECTED');

  const canApproveOrReject = task.canUserApprove !== undefined
    ? Boolean(task.canUserApprove)
    : (task.status === 'PENDING_REVIEW');

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

            {/* Attached Working Papers & Evidence Documents Section */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
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

                {!isReadOnly && (
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-600/30 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-all hover:bg-blue-100">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>Attach File</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Selected File Upload Action Card */}
              {selectedFile && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50/70 p-3">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                        <polyline points="13 2 13 9 20 9" />
                      </svg>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate text-xs font-bold text-slate-800">{selectedFile.name}</span>
                      <span className="text-[11px] text-slate-500">{formatFileSize(selectedFile.size)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      onClick={() => setSelectedFile(null)}
                      disabled={uploadingFile}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                      onClick={handleFileUpload}
                      disabled={uploadingFile}
                    >
                      {uploadingFile ? (
                        <>
                          <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                          <span>{uploadProgressMsg || 'Uploading...'}</span>
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <span>Upload to Storage</span>
                        </>
                      )}
                    </button>
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
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                  No documents attached yet. Click "Attach File" to upload working paper evidence directly to Cloud Storage.
                </div>
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
                              {/* Document Review Status Badge */}
                              {doc.status === 'APPROVED' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800" title={doc.actionedByName ? `Approved by ${doc.actionedByName}` : 'Approved'}>
                                  ✓ Approved
                                </span>
                              ) : doc.status === 'REJECTED' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10.5px] font-bold text-rose-800" title={doc.rejectionReason ? `Reason: ${doc.rejectionReason}` : 'Rejected'}>
                                  ✕ Rejected
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold text-amber-800">
                                  Pending Review
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
                          {/* Checker Approve (✓) / Reject (✕) Actions */}
                          {canApproveOrReject && (
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

                          {/* View / Download button */}
                          <button
                            type="button"
                            className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition-all"
                            onClick={() => handleDownload(doc)}
                            disabled={downloadingDocId === doc.documentId}
                            title="Generate Signed URL and view/download file"
                          >
                            {downloadingDocId === doc.documentId ? (
                              <svg className="h-3 w-3 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                              </svg>
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                            )}
                            <span>Download</span>
                          </button>

                          {/* Delete button (if not read-only) */}
                          {!isReadOnly && (
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
                    ? 'Read-only viewer mode...'
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
