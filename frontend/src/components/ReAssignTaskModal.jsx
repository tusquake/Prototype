import { useState, useEffect, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import UserPickerModal from './UserPickerModal';
import { getUsersByPermission, reAssignTask } from '../services/api';

// 1. Zod Validation Schema
const reAssignTaskSchema = z.object({
  comment: z.string().trim().min(1, 'Include a comment'),
  assignedMakerIds: z
    .array(z.string())
    .min(1, 'Select at least one task maker to reapprove'),
  assignedCheckerIds: z
    .array(z.string())
    .min(1, 'Select at least one task checker to reapprove'),
});

export default function ReAssignTaskModal({
  isOpen,
  onClose,
  onSuccess,
  taskId,
  categoryCode,
  categoryName,
  actor,
  recordNo,
}) {
  const [showMakerPicker, setShowMakerPicker] = useState(false);
  const [showCheckerPicker, setShowCheckerPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Permitted user lists
  const [permittedMakers, setPermittedMakers] = useState([]);
  const [permittedCheckers, setPermittedCheckers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // 2. Initialize React Hook Form
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(reAssignTaskSchema),
    defaultValues: {
      comment: '',
      assignedMakerIds: [],
      assignedCheckerIds: [],
    },
  });

  // 3. Watch array values reactively
  const assignedMakerIds = useWatch({ control, name: 'assignedMakerIds' }) || [];
  const assignedCheckerIds = useWatch({ control, name: 'assignedCheckerIds' }) || [];

  // Reset form state when modal opens or categoryCode/taskId changes
  useEffect(() => {
    if (isOpen) {
      reset({
        comment: '',
        assignedMakerIds: [],
        assignedCheckerIds: [],
      });
      setErrorMsg('');
    }
  }, [isOpen, categoryCode, taskId, reset]);

  // Load permitted users whenever categoryCode changes
  const loadPermittedUsers = useCallback(async (category) => {
    if (!category) return;
    setLoadingUsers(true);
    try {
      const [makers, checkers] = await Promise.all([
        getUsersByPermission(category, 'MAKER'),
        getUsersByPermission(category, 'CHECKER'),
      ]);
      setPermittedMakers(makers || []);
      setPermittedCheckers(checkers || []);
    } catch {
      setPermittedMakers([]);
      setPermittedCheckers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && categoryCode) {
      loadPermittedUsers(categoryCode);
    }
  }, [isOpen, categoryCode, loadPermittedUsers]);

  if (!isOpen) return null;

  function removeMaker(userId) {
    setValue(
      'assignedMakerIds',
      assignedMakerIds.filter((id) => id !== userId),
      { shouldValidate: true }
    );
  }

  function removeChecker(userId) {
    setValue(
      'assignedCheckerIds',
      assignedCheckerIds.filter((id) => id !== userId),
      { shouldValidate: true }
    );
  }

  // 4. Submit handler
  const onSubmit = async (data) => {
    setErrorMsg('');

    try {
      await reAssignTask(
        taskId,
        actor,
        data.comment,
        data.assignedMakerIds,
        data.assignedCheckerIds
      );

      if (onSuccess) onSuccess('Task reassigned successfully!');
      reset();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reassign Task');
    }
  };

  const noMakersMsg = loadingUsers
    ? 'Loading permitted makers…'
    : permittedMakers.length === 0
    ? 'No users have SOP Maker access for this category. Go to Access Control to grant access.'
    : null;

  const noCheckersMsg = loadingUsers
    ? 'Loading permitted checkers…'
    : permittedCheckers.length === 0
    ? 'No users have SOP Checker access for this category. Go to Access Control to grant access.'
    : null;

  return (
    <>
      <div
        className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-[modalFade_0.2s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-7 pb-[18px] pt-6">
            <div className="flex flex-col">
              <h3 className="m-0 text-lg font-bold text-slate-900">
                ReAssign Makers & Checkers
              </h3>
              <p className="mt-0.5 text-[12.5px] text-slate-500">
                Makers & Checkers lists show only users with required permissions
                for the selected category under which the SOP Task is created.
              </p>
            </div>
            <button
              type="button"
              className="rounded-md p-1 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-900"
              onClick={onClose}
              title="Close modal"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto px-7 py-6">
            {errorMsg && (
              <div className="rounded-lg border border-red-300 bg-red-100 p-2.5 text-xs font-medium text-red-600">
                {errorMsg}
              </div>
            )}

            <form
              id="assign-sop-form"
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              {/* Record No */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Task No
                </span>
                <input
                  readOnly
                  type="text"
                  placeholder=""
                  value={recordNo || ''}
                  className="w-full px-3 py-[10px] border border-[#cbd5e1] rounded-[8px] text-[13px] bg-[#f1f5f9] text-[#475569] font-semibold outline-none cursor-not-allowed box-border"
                />
              </div>

              {/* Process Category */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Process Category
                </span>
                <input
                  readOnly
                  type="text"
                  placeholder=""
                  value={categoryName || ''}
                  className="w-full px-3 py-[10px] border border-[#cbd5e1] rounded-[8px] text-[13px] bg-[#f1f5f9] text-[#475569] font-semibold outline-none cursor-not-allowed box-border"
                />
              </div>

              {/* ReAssign Task Makers */}
              <div className="flex flex-col gap-1">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    ReAssign Task Makers *
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMakerPicker(true)}
                    disabled={loadingUsers || permittedMakers.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.25 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Select Makers ({assignedMakerIds.length})
                  </button>
                </div>

                {noMakersMsg ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                    {noMakersMsg}
                  </div>
                ) : (
                  <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2">
                    {assignedMakerIds.length === 0 ? (
                      <span className="text-xs italic text-slate-400">
                        No makers selected — click "Select Makers" above
                      </span>
                    ) : (
                      assignedMakerIds.map((id) => {
                        const u = permittedMakers.find((x) => x.id === id) || {
                          id,
                          name: id,
                        };
                        return (
                          <div
                            key={id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                          >
                            <span>{u.name || id}</span>
                            <button
                              type="button"
                              onClick={() => removeMaker(id)}
                              title="Remove maker"
                              className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-500/20 text-[12px] leading-none text-slate-600 hover:bg-slate-500/30"
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
                {errors.assignedMakerIds && (
                  <p className="text-[12px] font-medium text-red-500 mt-0.5">
                    {errors.assignedMakerIds.message}
                  </p>
                )}
              </div>

              {/* ReAssign Task Checkers */}
              <div className="flex flex-col gap-1">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    ReAssign Task Checkers *
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCheckerPicker(true)}
                    disabled={loadingUsers || permittedCheckers.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.25 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Select Checkers ({assignedCheckerIds.length})
                  </button>
                </div>

                {noCheckersMsg ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                    {noCheckersMsg}
                  </div>
                ) : (
                  <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2">
                    {assignedCheckerIds.length === 0 ? (
                      <span className="text-xs italic text-slate-400">
                        No checkers selected — click "Select Checkers" above
                      </span>
                    ) : (
                      assignedCheckerIds.map((id) => {
                        const u = permittedCheckers.find((x) => x.id === id) || {
                          id,
                          name: id,
                        };
                        return (
                          <div
                            key={id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                          >
                            <span>{u.name || id}</span>
                            <button
                              type="button"
                              onClick={() => removeChecker(id)}
                              title="Remove checker"
                              className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-500/20 text-[12px] leading-none text-slate-600 hover:bg-slate-500/30"
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
                {errors.assignedCheckerIds && (
                  <p className="text-[12px] font-medium text-red-500 mt-0.5">
                    {errors.assignedCheckerIds.message}
                  </p>
                )}
              </div>

              {/* Comment Input */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Comment *
                </span>
                <input
                  type="text"
                  placeholder="Enter reason or instructions for reassigning..."
                  {...register('comment')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
                {errors.comment && (
                  <p className="text-[12px] font-medium text-red-500 mt-0.5">
                    {errors.comment.message}
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-7 py-4">
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="assign-sop-form"
              className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:border-blue-700 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || loadingUsers}
            >
              {isSubmitting ? 'ReAssigning…' : 'ReAssign Task'}
            </button>
          </div>
        </div>
      </div>

      {/* UserPickerModal for Task Makers */}
      <UserPickerModal
        isOpen={showMakerPicker}
        title="Select Assigned SOP Makers"
        selectedUserIds={assignedMakerIds}
        permittedUsers={permittedMakers}
        onClose={() => setShowMakerPicker(false)}
        onConfirm={(selectedIds) => {
          setValue('assignedMakerIds', selectedIds, { shouldValidate: true });
          setShowMakerPicker(false);
        }}
        onSelect={(selectedIds) => {
          setValue('assignedMakerIds', selectedIds, { shouldValidate: true });
          setShowMakerPicker(false);
        }}
      />

      {/* UserPickerModal for Task Checkers */}
      <UserPickerModal
        isOpen={showCheckerPicker}
        title="Select Assigned SOP Checkers"
        selectedUserIds={assignedCheckerIds}
        permittedUsers={permittedCheckers}
        onClose={() => setShowCheckerPicker(false)}
        onConfirm={(selectedIds) => {
          setValue('assignedCheckerIds', selectedIds, { shouldValidate: true });
          setShowCheckerPicker(false);
        }}
        onSelect={(selectedIds) => {
          setValue('assignedCheckerIds', selectedIds, { shouldValidate: true });
          setShowCheckerPicker(false);
        }}
      />
    </>
  );
}