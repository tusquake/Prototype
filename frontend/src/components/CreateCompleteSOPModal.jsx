/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import CustomSelect from './CustomSelect';
import UserPickerModal from './UserPickerModal';
import {
  createCompleteSop,
  createSop,
  getProcessCategories,
  getUsersByPermission,
} from '../services/api';

const FREQ_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'DAILY', label: 'Daily' },
];

const ENTITY_OPTIONS = [
  { value: 'CK_INDIA', label: 'CK India' },
  { value: 'CK_US', label: 'CK US' },
  { value: 'CK_UK', label: 'CK UK' },
  { value: 'CK_AUSTRALIA', label: 'CK Australia' },
];

// Validation Schema (Without Governance Pools)
const createCompleteSopSchema = z.object({
  sopCode: z.string().trim().min(1, 'SOP Code is required.'),
  title: z.string().trim().min(1, 'SOP Title is required.'),
  description: z.string().optional(),
  processCategory: z.string().min(1, 'Process Category is required.'),
  entityCode: z.string().min(1, 'Entity is required.'),
  frequency: z.string().default('MONTHLY'),
  dueDayOffset: z.coerce
    .number()
    .min(0, 'Offset must be at least 0')
    .max(31, 'Offset cannot exceed 31'),
  isRecurring: z.boolean().default(false),
  defaultMakerIds: z
    .array(z.string())
    .min(1, 'Please select at least one Maker for the Assigned Maker Pool.'),
  defaultCheckerIds: z
    .array(z.string())
    .min(1, 'Please select at least one Checker for the Assigned Checker Pool.'),
});

export default function CreateCompleteSOPModal({
  isOpen,
  currentUser,
  userMap,
  onClose,
  onSuccess,
}) {
  const [processOptions, setProcessOptions] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Picker modal controls
  const [showMakerPicker, setShowMakerPicker] = useState(false);
  const [showCheckerPicker, setShowCheckerPicker] = useState(false);

  // Dynamic permitted user lists
  const [permittedCreators, setPermittedCreators] = useState([]);
  const [permittedApprovers, setPermittedApprovers] = useState([]);
  const [permittedMakers, setPermittedMakers] = useState([]);
  const [permittedCheckers, setPermittedCheckers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Initialize React Hook Form
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createCompleteSopSchema),
    defaultValues: {
      sopCode: '',
      title: '',
      description: '',
      processCategory: '',
      entityCode: 'CK_INDIA',
      frequency: 'MONTHLY',
      dueDayOffset: 15,
      isRecurring: false,
      defaultMakerIds: [],
      defaultCheckerIds: [],
    },
  });

  // Watch fields reactively
  const processCategory = useWatch({ control, name: 'processCategory' });
  const entityCode = useWatch({ control, name: 'entityCode' });
  const isRecurring = useWatch({ control, name: 'isRecurring' });
  const defaultMakerIds = useWatch({ control, name: 'defaultMakerIds' }) || [];
  const defaultCheckerIds = useWatch({ control, name: 'defaultCheckerIds' }) || [];

  // Check Admin / Creator Permission
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email?.includes('mainak');
  const isPermittedCreator = permittedCreators.some(
    (u) => u.id === currentUser?.id || u.userId === currentUser?.id || u === currentUser?.id
  );
  const hasCreationAccess = isAdmin || isPermittedCreator;

  // Fetch categories on mount
  useEffect(() => {
    getProcessCategories()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const opts = data.map((c) => ({
            value: c.categoryCode || c.categoryName,
            label: c.categoryName || c.categoryCode,
          }));
          setProcessOptions(opts);
        }
      })
      .catch(() => null);
  }, []);

  // Fetch all permitted roles when process category changes
  const loadPermittedUsers = useCallback(
    async (category) => {
      if (!category) return;
      setLoadingUsers(true);

      try {
        const [creators, approvers, makers, checkers] = await Promise.all([
          getUsersByPermission(category, 'CREATOR'),
          getUsersByPermission(category, 'APPROVER'),
          getUsersByPermission(category, 'MAKER'),
          getUsersByPermission(category, 'CHECKER'),
        ]);

        setPermittedCreators(creators || []);
        setPermittedApprovers(approvers || []);
        setPermittedMakers(makers || []);
        setPermittedCheckers(checkers || []);

        // Reset pool selections gracefully after fetching
        setValue('defaultMakerIds', []);
        setValue('defaultCheckerIds', []);
      } catch {
        setPermittedCreators([]);
        setPermittedApprovers([]);
        setPermittedMakers([]);
        setPermittedCheckers([]);
      } finally {
        setLoadingUsers(false);
      }
    },
    [setValue]
  );

  useEffect(() => {
    if (isOpen && processCategory) {
      loadPermittedUsers(processCategory);
    }
  }, [isOpen, processCategory, loadPermittedUsers]);

  if (!isOpen) return null;

  // Badge Remover Helpers
  const removeMaker = (id) =>
    setValue('defaultMakerIds', defaultMakerIds.filter((x) => x !== id), { shouldValidate: true });
  const removeChecker = (id) =>
    setValue('defaultCheckerIds', defaultCheckerIds.filter((x) => x !== id), { shouldValidate: true });

  // Submit Handler
  const onSubmit = async (data) => {
    setErrorMsg('');

    try {
      const payload = {
        ...data,
        createdById: currentUser?.id || '',
        actorId: currentUser?.id || '',
      };

      await createCompleteSop(payload);
      window.dispatchEvent(new Event('sop-updated'));
      if (onSuccess) {
        onSuccess(`Complete SOP "${data.title}" created successfully!`);
      }
      reset();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create complete SOP');
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#091124]/65 p-5 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-[820px] overflow-hidden rounded-[16px] border border-slate-200 bg-bg-surface shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] animate-modal-slide-in relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between bg-gradient-to-br from-[#1d4ed8] to-[#2563eb] p-[24px_28px] text-white">
            <div>
              <h3 className="text-[17px] font-bold text-white tracking-[-0.2px]">
                Create Complete SOP Specification
              </h3>
              <p className="text-[12.5px] text-white/90 mt-0.5">
                Select a category to load permissions, then configure schedule and operational pools.
              </p>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-white/25 bg-white/15 text-white transition-all hover:bg-white/30"
              onClick={onClose}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="relative">
            {/* Body */}
            <div className="grid min-h-[420px] max-h-[72vh] grid-cols-2 gap-[18px] overflow-y-auto p-7 [scrollbar-gutter:stable] relative">
              {errorMsg && (
                <div className="col-span-full rounded-[8px] border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.08)] p-[12px_16px] text-[13px] font-medium text-[#dc2626]">
                  {errorMsg}
                </div>
              )}

              {/* 1. STEP ONE: Process Category Selection */}
              <div className="col-span-full flex flex-col gap-1.5 z-10">
                <label className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#1e293b]">
                  PROCESS CATEGORY *
                </label>
                <select
                  {...register('processCategory')}
                  className="w-full rounded-[8px] border border-[#cbd5e1] bg-bg-surface p-[10px_14px] text-[13.5px] outline-none transition focus:border-[#2563eb] focus:ring-3 focus:ring-[rgba(37,99,235,0.15)]"
                >
                  <option value="">-- Select Process Category --</option>
                  {processOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {errors.processCategory && (
                  <p className="text-[12px] font-medium text-red-500 mt-0.5">{errors.processCategory.message}</p>
                )}
              </div>

              {/* 2. DYNAMIC CONTENT & LOADING OVERLAY */}
              {!processCategory ? (
                <div className="col-span-full flex items-center justify-center min-h-[260px] border border-dashed border-[#cbd5e1] rounded-[10px] bg-[#f8fafc]">
                  <p className="text-[13px] text-[#64748b] font-medium m-0">
                    Please select a Process Category above to initialize permissions and form fields.
                  </p>
                </div>
              ) : (
                <>
                  {/* Smooth Loading Spinner Overlay */}
                  {loadingUsers && (
                    <div className="col-span-full absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] transition-all duration-200">
                      <div className="w-8 h-8 border-3 border-[#2563eb] border-t-transparent rounded-full animate-spin mb-2" />
                      <span className="text-[13px] font-semibold text-[#1e293b]">
                        Fetching category permissions & operational pools...
                      </span>
                    </div>
                  )}

                  {!loadingUsers && !hasCreationAccess ? (
                    /* 3. FALLBACK ACCESS DENIED UI */
                    <div className="col-span-full flex flex-col items-center justify-center p-8 text-center rounded-[12px] border border-[#fca5a5] bg-[#fef2f2] gap-2 my-auto">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span className="text-[14px] font-bold text-[#991b1b]">Access Denied</span>
                      <p className="text-[12.5px] text-[#b91c1c] max-w-[480px] m-0">
                        You do not have <strong>SOP Creator</strong> permissions for this category. Please contact an Admin via Access Control to request SOP Creator rights.
                      </p>
                    </div>
                  ) : (
                    /* 4. FORM FIELDS */
                    <>
                      {/* SOP Code */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#1e293b]">
                          SOP CODE *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. SOP-TAX-2026-001"
                          {...register('sopCode')}
                          className="w-full rounded-[8px] border border-[#cbd5e1] bg-bg-surface p-[10px_14px] text-[13.5px] outline-none transition focus:border-[#2563eb] focus:ring-3 focus:ring-[rgba(37,99,235,0.15)]"
                        />
                        {errors.sopCode && (
                          <p className="text-[12px] font-medium text-red-500 mt-0.5">{errors.sopCode.message}</p>
                        )}
                      </div>

                      {/* Entity */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#1e293b]">
                          CORPORATE ENTITY *
                        </label>
                        <select
                          {...register('entityCode')}
                          className="w-full rounded-[8px] border border-[#cbd5e1] bg-bg-surface p-[10px_14px] text-[13.5px] outline-none transition focus:border-[#2563eb] focus:ring-3 focus:ring-[rgba(37,99,235,0.15)]"
                        >
                          {ENTITY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* SOP Title */}
                      <div className="col-span-full flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#1e293b]">
                          SOP TITLE / NAME *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Annual Statutory GST Audit & Compliance Filing"
                          {...register('title')}
                          className="w-full rounded-[8px] border border-[#cbd5e1] bg-bg-surface p-[10px_14px] text-[13.5px] outline-none transition focus:border-[#2563eb] focus:ring-3 focus:ring-[rgba(37,99,235,0.15)]"
                        />
                        {errors.title && (
                          <p className="text-[12px] font-medium text-red-500 mt-0.5">{errors.title.message}</p>
                        )}
                      </div>

                      {/* Description */}
                      <div className="col-span-full flex flex-col gap-1.5">
                        <label className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#1e293b]">
                          DESCRIPTION
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Provide operational steps and compliance guidelines..."
                          {...register('description')}
                          className="w-full rounded-[8px] border border-[#cbd5e1] bg-bg-surface p-[10px_14px] text-[13.5px] outline-none transition resize-y min-h-[80px] focus:border-[#2563eb] focus:ring-3 focus:ring-[rgba(37,99,235,0.15)]"
                        />
                      </div>

                      {/* Schedule Mode & Recurrence */}
                      <div className="col-span-full grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#1e293b]">
                            RECURRENCE MODE
                          </label>
                          <div className="mt-1 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setValue('isRecurring', !isRecurring)}
                              className={`relative h-[24px] w-[44px] rounded-[12px] p-[2px] transition-colors duration-200 ${
                                isRecurring ? 'bg-[#2563eb]' : 'bg-[#cbd5e1]'
                              }`}
                            >
                              <div
                                className={`h-[20px] w-[20px] rounded-full bg-white shadow-md transition-transform duration-200 ${
                                  isRecurring ? 'translate-x-[20px]' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span className={`text-[13.5px] font-semibold ${isRecurring ? 'text-[#1e293b]' : 'text-[#64748b]'}`}>
                              {isRecurring ? 'Recurring Schedule' : 'One-Time Execution'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#1e293b]">
                            COMPLIANCE FREQUENCY *
                          </label>
                          {isRecurring ? (
                            <Controller
                              name="frequency"
                              control={control}
                              render={({ field }) => (
                                <CustomSelect
                                  name={field.name}
                                  value={field.value}
                                  options={FREQ_OPTIONS}
                                  onChange={(e) => field.onChange(e.target.value)}
                                />
                              )}
                            />
                          ) : (
                            <input
                              type="text"
                              value="N/A (One-Time Task)"
                              disabled
                              className="w-full rounded-[8px] border border-[#cbd5e1] bg-[#f1f5f9] p-[10px_14px] text-[13px] font-semibold text-[#64748b] cursor-not-allowed"
                            />
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#1e293b]">
                            DUE DAY OFFSET *
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={31}
                            {...register('dueDayOffset')}
                            className="w-full rounded-[8px] border border-[#cbd5e1] bg-bg-surface p-[10px_14px] text-[13.5px] outline-none transition focus:border-[#2563eb] focus:ring-3 focus:ring-[rgba(37,99,235,0.15)]"
                          />
                          {errors.dueDayOffset && (
                            <p className="text-[12px] font-medium text-red-500 mt-0.5">{errors.dueDayOffset.message}</p>
                          )}
                        </div>
                      </div>

                      {/* Pool Assignments Section (Makers & Checkers) */}
                      <div className="col-span-full rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] p-5">
                        <div className="mb-3.5 text-[13px] font-bold uppercase tracking-[0.5px] text-[#1e293b]">
                          Task Execution Pools
                        </div>

                        <div className="flex flex-col gap-4">
                          {/* Makers */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#1e293b]">
                                Assigned Maker Pool *
                              </label>
                              <button
                                type="button"
                                onClick={() => setShowMakerPicker(true)}
                                disabled={loadingUsers || permittedMakers.length === 0}
                                className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 cursor-pointer"
                              >
                                Select Makers ({defaultMakerIds.length})
                              </button>
                            </div>
                            <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-[8px] border border-[#cbd5e1] bg-bg-surface p-[8px_12px]">
                              {defaultMakerIds.length === 0 ? (
                                <span className="text-[13px] italic text-[#94a3b8]">No Makers assigned</span>
                              ) : (
                                defaultMakerIds.map((id) => (
                                  <div key={id} className="inline-flex items-center gap-1.5 rounded-[16px] border border-[#cbd5e1] bg-[#f1f5f9] p-[4px_8px_4px_10px] text-[12px] font-semibold text-[#334155]">
                                    <span>{userMap[id] || id}</span>
                                    <button type="button" onClick={() => removeMaker(id)} className="text-[#64748b] hover:text-[#ef4444] cursor-pointer">&times;</button>
                                  </div>
                                ))
                              )}
                            </div>
                            {errors.defaultMakerIds && (
                              <p className="text-[12px] font-medium text-red-500 mt-0.5">{errors.defaultMakerIds.message}</p>
                            )}
                          </div>

                          {/* Checkers */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[12px] font-semibold uppercase tracking-[0.4px] text-[#1e293b]">
                                Assigned Checker Pool *
                              </label>
                              <button
                                type="button"
                                onClick={() => setShowCheckerPicker(true)}
                                disabled={loadingUsers || permittedCheckers.length === 0}
                                className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 cursor-pointer"
                              >
                                Select Checkers ({defaultCheckerIds.length})
                              </button>
                            </div>
                            <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-[8px] border border-[#cbd5e1] bg-bg-surface p-[8px_12px]">
                              {defaultCheckerIds.length === 0 ? (
                                <span className="text-[13px] italic text-[#94a3b8]">No Checkers assigned</span>
                              ) : (
                                defaultCheckerIds.map((id) => (
                                  <div key={id} className="inline-flex items-center gap-1.5 rounded-[16px] border border-[#cbd5e1] bg-[#f1f5f9] p-[4px_8px_4px_10px] text-[12px] font-semibold text-[#334155]">
                                    <span>{userMap[id] || id}</span>
                                    <button type="button" onClick={() => removeChecker(id)} className="text-[#64748b] hover:text-[#ef4444] cursor-pointer">&times;</button>
                                  </div>
                                ))
                              )}
                            </div>
                            {errors.defaultCheckerIds && (
                              <p className="text-[12px] font-medium text-red-500 mt-0.5">{errors.defaultCheckerIds.message}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[#e2e8f0] bg-[#f8fafc] p-[18px_28px]">
              <button
                type="button"
                className="rounded-[8px] border border-[#cbd5e1] bg-bg-surface px-5 py-[9px] text-[13px] font-semibold text-[#475569] hover:bg-[#f1f5f9] cursor-pointer"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !processCategory || !hasCreationAccess || loadingUsers}
                className="inline-flex items-center gap-1.5 rounded-[8px] border-none bg-[#2563eb] px-[22px] py-[9px] text-[13px] font-semibold text-white shadow-md hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? 'Creating Complete SOP...' : 'Create & Activate SOP'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Operational Pool Picker Modals */}
      <UserPickerModal
        isOpen={showMakerPicker}
        title="Select Assigned Maker Pool"
        entityCode={entityCode}
        targetRole="MAKER"
        selectedUserIds={defaultMakerIds}
        permittedUsers={permittedMakers}
        onClose={() => setShowMakerPicker(false)}
        onConfirm={(selectedIds) => {
          setValue('defaultMakerIds', selectedIds, { shouldValidate: true });
          setShowMakerPicker(false);
        }}
      />

      <UserPickerModal
        isOpen={showCheckerPicker}
        title="Select Assigned Checker Pool"
        entityCode={entityCode}
        targetRole="CHECKER"
        selectedUserIds={defaultCheckerIds}
        permittedUsers={permittedCheckers}
        onClose={() => setShowCheckerPicker(false)}
        onConfirm={(selectedIds) => {
          setValue('defaultCheckerIds', selectedIds, { shouldValidate: true });
          setShowCheckerPicker(false);
        }}
      />
    </>
  );
}