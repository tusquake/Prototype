import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import UserPickerModal from './UserPickerModal';
import {
  getUsersByPermission,
  getProcessCategories,
  getUserCreatableCategories,
  fetchEntities,
  createSopTemplate,
  updateSopTemplate,
  addTaskTemplateStep,
  updateTaskTemplateStep,
  deleteTaskTemplateStep,
  submitSopTemplate,
  activateSopTemplate,
  getSopTemplate,
} from '../services/api';

const FREQ_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'DAILY', label: 'Daily' },
];

const ENTITY_OPTIONS = [];

// SCHEMA: Step 1 Template Validation
const step1Schema = z.object({
  sopCode: z.string().trim().min(1, 'Template Code is required.'),
  title: z.string().trim().min(1, 'Template Title is required.'),
  description: z.string().optional(),
  processCategory: z.string().min(1, 'Process Category is required.'),
  entityCode: z.string().min(1, 'Corporate Entity is required.'),
  effectiveFrom: z.string().min(1, 'Effective From Date is required.'),
  effectiveUntil: z.string().optional(),
  frequency: z.string().default('MONTHLY'),
  dueDayOffset: z.coerce
    .number()
    .min(0, 'Offset must be at least 0')
    .max(365, 'Offset cannot exceed 365 days'),
  isRecurring: z.boolean().default(true),
  defaultMakerIds: z
    .array(z.string())
    .min(1, 'Select at least one Maker for the Assigned Maker Pool.'),
  defaultCheckerIds: z
    .array(z.string())
    .min(1, 'Select at least one Checker for the Assigned Checker Pool.'),
});

function CustomSelect({ name, value, options, disabled, onChange }) {
  return (
    <select
      name={name}
      value={value}
      disabled={disabled}
      onChange={onChange}
      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function CreateTaskModal({
  isOpen,
  onClose,
  onSaveTask,
  existingTasksCount,
  userMap,
  parentMakerPool,
  parentCheckerPool,
  editingTask = null,
  isViewOnly = false,
}) {
  const [taskTitle, setTaskTitle] = useState('');
  const [slaHours, setSlaHours] = useState(24);
  const [taskDependencyMode, setTaskDependencyMode] = useState(
    existingTasksCount === 0 ? 'INDEPENDENT' : 'DEPENDENT_ON_PREVIOUS'
  );
  const [taskPriority, setTaskPriority] = useState('Medium');

  // ETA Days (User-friendly relative offsets from SOP start)
  const [etaStartDay, setEtaStartDay] = useState(0);
  const [etaEndDay, setEtaEndDay] = useState(7);

  // Task-specific pools (subset of parent pools)
  const [taskMakers, setTaskMakers] = useState([]);
  const [taskCheckers, setTaskCheckers] = useState([]);
  const [showMakerPicker, setShowMakerPicker] = useState(false);
  const [showCheckerPicker, setShowCheckerPicker] = useState(false);

  // Requirement: Task level required documents
  const [taskLevelDocs, setTaskLevelDocs] = useState([]);
  const [newDocName, setNewDocName] = useState('');

  const [taskError, setTaskError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setTaskTitle(editingTask.title || '');
        setSlaHours(editingTask.slaHours || 24);
        setTaskDependencyMode(editingTask.dependencyMode || 'INDEPENDENT');
        setTaskPriority(editingTask.priority || 'Medium');
        setEtaStartDay(editingTask.etaStartDay !== undefined ? editingTask.etaStartDay : 0);
        setEtaEndDay(editingTask.etaEndDay !== undefined ? editingTask.etaEndDay : 7);
        setTaskMakers(editingTask.makers || []);
        setTaskCheckers(editingTask.checkers || []);
        setTaskLevelDocs(editingTask.requiredDocs || []);
        setTaskError('');
      } else {
        setTaskTitle('');
        setSlaHours(24);
        setTaskDependencyMode(existingTasksCount === 0 ? 'INDEPENDENT' : 'DEPENDENT_ON_PREVIOUS');
        setTaskPriority('Medium');
        setEtaStartDay(0);
        setEtaEndDay(7);
        setTaskMakers([]);
        setTaskCheckers([]);
        setTaskLevelDocs([]);
        setTaskError('');
      }
    }
  }, [isOpen, editingTask, existingTasksCount]);

  if (!isOpen) return null;

  const handleAddDoc = () => {
    if (isViewOnly) return;
    const trimmed = newDocName.trim();
    if (!trimmed) return;
    if (taskLevelDocs.includes(trimmed)) {
      setTaskError('Document already exists in checklist.');
      return;
    }
    setTaskLevelDocs([...taskLevelDocs, trimmed]);
    setNewDocName('');
    setTaskError('');
  };

  const removeMaker = (id) => { if (!isViewOnly) setTaskMakers(taskMakers.filter((x) => x !== id)); };
  const removeChecker = (id) => { if (!isViewOnly) setTaskCheckers(taskCheckers.filter((x) => x !== id)); };

  const handleSave = () => {
    if (isViewOnly) {
      onClose();
      return;
    }
    if (!taskTitle.trim()) {
      setTaskError('Task Name is required.');
      return;
    }
    if (etaEndDay <= 0) {
      setTaskError('ETA Days must be at least 1 day.');
      return;
    }
    if (taskMakers.length === 0) {
      setTaskError('Please select at least one Maker for this task.');
      return;
    }
    if (taskCheckers.length === 0) {
      setTaskError('Please select at least one Checker for this task.');
      return;
    }

    const newTaskTemplate = {
      id: editingTask ? editingTask.id : `task-template-${Date.now()}`,
      taskTemplateId: editingTask ? editingTask.taskTemplateId : null,
      stepSequence: editingTask ? editingTask.stepSequence : existingTasksCount + 1,
      title: taskTitle.trim(),
      slaHours: Number(slaHours) || 24,
      dependencyMode: editingTask ? taskDependencyMode : (existingTasksCount === 0 ? 'INDEPENDENT' : taskDependencyMode),
      priority: taskPriority,
      etaStartDay: Number(etaStartDay) || 0,
      etaEndDay: Number(etaEndDay) || 0,
      requiredDocs: [...taskLevelDocs],
      makers: taskMakers,
      checkers: taskCheckers,
      savedToBackend: !!editingTask?.taskTemplateId,
    };

    onSaveTask(newTaskTemplate, !!editingTask);
  };

  // Convert string arrays to object arrays for UserPickerModal compatibility
  const formattedParentMakers = parentMakerPool.map((id) => ({ id, name: userMap[id] || id }));
  const formattedParentCheckers = parentCheckerPool.map((id) => ({ id, name: userMap[id] || id }));

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              {isViewOnly ? `View Step ${editingTask?.stepSequence || 1} Task Details` : editingTask ? `Edit Step ${editingTask.stepSequence} Task Template` : `Create Step ${existingTasksCount + 1} Task Template`}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Define blueprint rules & ETA days for this execution step.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {taskError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-600">
              {taskError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Task Template Name *</label>
            <input
              type="text"
              value={taskTitle}
              disabled={isViewOnly}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Verify Ledger Entries"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Step Dependency</label>
              <select
                value={taskDependencyMode}
                onChange={(e) => setTaskDependencyMode(e.target.value)}
                disabled={isViewOnly || existingTasksCount === 0}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
              >
                <option value="INDEPENDENT">Independent Task</option>
                {existingTasksCount > 0 && (
                  <option value="DEPENDENT_ON_PREVIOUS">Dependent on Step {existingTasksCount}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Target SLA (Hours) *</label>
              <input
                type="number"
                value={slaHours}
                disabled={isViewOnly}
                onChange={(e) => setSlaHours(e.target.value)}
                min={1}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Priority Level</label>
            <select
              value={taskPriority}
              disabled={isViewOnly}
              onChange={(e) => setTaskPriority(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          {/* User-friendly ETA Days Section */}
          <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">Task Timeline & ETA Days</h4>
            <div>
              <label className="block text-[11px] font-semibold uppercase text-blue-800 mb-1">
                ETA Days (Task Duration / Deadline) *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-700">Days</span>
                <input
                  type="number"
                  min={1}
                  disabled={isViewOnly}
                  value={etaEndDay}
                  onChange={(e) => setEtaEndDay(Number(e.target.value))}
                  className="w-full rounded-lg border border-blue-300 bg-white p-2 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Task starts on SOP Start Date (or after preceding task completion) and must finish within {etaEndDay} days.
              </span>
            </div>
          </div>

          {/* Task Level Documents */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Required Task Documents</h4>
            {!isViewOnly && (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="e.g. Form 16B"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDoc())}
                  className="flex-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddDoc}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  + Add
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {taskLevelDocs.length === 0 ? (
                <span className="text-[11px] italic text-slate-400">No documents required for this step.</span>
              ) : (
                taskLevelDocs.map((doc) => (
                  <span key={doc} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                    {doc}
                    {!isViewOnly && (
                      <button type="button" onClick={() => setTaskLevelDocs(taskLevelDocs.filter((d) => d !== doc))} className="text-blue-400 hover:text-red-500 font-bold">✕</button>
                    )}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Task Execution Pools */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold uppercase text-slate-600">Task Makers</label>
                {!isViewOnly && (
                  <button type="button" onClick={() => setShowMakerPicker(true)} className="text-[10px] font-bold text-blue-600 hover:underline">Select</button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {taskMakers.length === 0 ? (
                  <span className="text-[10px] text-slate-400">Inherit all SOP Makers</span>
                ) : (
                  taskMakers.map((id) => (
                    <span key={id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 border border-slate-200">
                      {userMap[id] || id} {!isViewOnly && <button type="button" onClick={() => removeMaker(id)} className="text-slate-400 hover:text-red-500">✕</button>}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold uppercase text-slate-600">Task Checkers</label>
                {!isViewOnly && (
                  <button type="button" onClick={() => setShowCheckerPicker(true)} className="text-[10px] font-bold text-blue-600 hover:underline">Select</button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {taskCheckers.length === 0 ? (
                  <span className="text-[10px] text-slate-400">Inherit all SOP Checkers</span>
                ) : (
                  taskCheckers.map((id) => (
                    <span key={id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 border border-slate-200">
                      {userMap[id] || id} {!isViewOnly && <button type="button" onClick={() => removeChecker(id)} className="text-slate-400 hover:text-red-500">✕</button>}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 p-4 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-white">
            {isViewOnly ? 'Close' : 'Cancel'}
          </button>
          {!isViewOnly && (
            <button onClick={handleSave} className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700">Save Task Template</button>
          )}
        </div>
      </div>

      {!isViewOnly && (
        <>
          <UserPickerModal
            isOpen={showMakerPicker}
            title="Select Task Makers (from SOP Pool)"
            targetRole="MAKER"
            selectedUserIds={taskMakers}
            permittedUsers={formattedParentMakers}
            onClose={() => setShowMakerPicker(false)}
            onConfirm={(ids) => { setTaskMakers(ids); setShowMakerPicker(false); }}
          />
          <UserPickerModal
            isOpen={showCheckerPicker}
            title="Select Task Checkers (from SOP Pool)"
            targetRole="CHECKER"
            selectedUserIds={taskCheckers}
            permittedUsers={formattedParentCheckers}
            onClose={() => setShowCheckerPicker(false)}
            onConfirm={(ids) => { setTaskCheckers(ids); setShowCheckerPicker(false); }}
          />
        </>
      )}
    </div>
  );
}

export default function CreateSopDrawer({
  isOpen = true,
  editingTemplate = null,
  isViewOnly = false,
  currentUser = { id: 'usr-manoj-042', name: 'Compliance Lead', role: 'ADMIN' },
  userMap = {},
  creatableCategories = [],
  onClose = () => { },
  onSuccess = () => { },
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [templateId, setTemplateId] = useState(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email?.includes('mainak');

  const [processOptions, setProcessOptions] = useState([]);
  const [entityOptions, setEntityOptions] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const [showMakerPicker, setShowMakerPicker] = useState(false);
  const [showCheckerPicker, setShowCheckerPicker] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [editingTaskStep, setEditingTaskStep] = useState(null);

  const [permittedMakers, setPermittedMakers] = useState([]);
  const [permittedCheckers, setPermittedCheckers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [localUserMap, setLocalUserMap] = useState(userMap);

  const [taskTemplates, setTaskTemplates] = useState([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const handleApproveSopTemplate = async () => {
    const tId = templateId || editingTemplate?.templateId || editingTemplate?.id;
    if (!tId) return;
    try {
      setIsProcessingAction(true);
      setErrorMsg('');
      await activateSopTemplate(tId, currentUser?.id || 'usr-vivek-108');
      onSuccess(`SOP Template "${getValues('title') || editingTemplate?.title || 'Blueprint'}" approved successfully! Status is now ACTIVE.`);
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to approve SOP Template.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectSopTemplate = async () => {
    const tId = templateId || editingTemplate?.templateId || editingTemplate?.id;
    if (!tId) return;
    if (!rejectionReason.trim()) {
      setErrorMsg('Please enter a rejection reason comment.');
      return;
    }
    try {
      setIsProcessingAction(true);
      setErrorMsg('');
      await rejectSopTemplate(tId, rejectionReason.trim());
      onSuccess(`SOP Template rejected back to creator for revision.`);
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to reject SOP Template.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    trigger,
    getValues,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      sopCode: '',
      title: '',
      description: '',
      processCategory: '',
      entityCode: '',
      effectiveFrom: todayStr,
      effectiveUntil: '',
      frequency: 'MONTHLY',
      dueDayOffset: 15,
      isRecurring: true,
      defaultMakerIds: [],
      defaultCheckerIds: [],
    },
  });

  const processCategory = useWatch({ control, name: 'processCategory' });
  const isRecurring = useWatch({ control, name: 'isRecurring' });
  const frequency = useWatch({ control, name: 'frequency' }) || 'MONTHLY';
  const dueDayOffset = useWatch({ control, name: 'dueDayOffset' }) || 15;
  const defaultMakerIds = useWatch({ control, name: 'defaultMakerIds' }) || [];
  const defaultCheckerIds = useWatch({ control, name: 'defaultCheckerIds' }) || [];

  const [selectedWeekDays, setSelectedWeekDays] = useState(['MON']);
  const [selectedDayOfMonth, setSelectedDayOfMonth] = useState(15);
  const [selectedQuarterMonth, setSelectedQuarterMonth] = useState(1);
  const [selectedAnnualMonth, setSelectedAnnualMonth] = useState('MAR');
  const [selectedDailyMode, setSelectedDailyMode] = useState('BUSINESS_DAYS');

  const getScheduleSummary = () => {
    if (!isRecurring) {
      return 'Manual One-Time execution: Instance tasks will generate once upon explicit manual trigger.';
    }
    const offset = dueDayOffset || 15;
    switch (frequency) {
      case 'WEEKLY':
        return `Automated WEEKLY generation every ${selectedWeekDays.join(', ')}. Execution completion window is ${offset} ETA days.`;
      case 'MONTHLY':
        return `Automated MONTHLY generation on Day ${selectedDayOfMonth} of every month. Execution completion window is ${offset} ETA days.`;
      case 'QUARTERLY': {
        const qMonths = { 1: '1st Month (Jan/Apr/Jul/Oct)', 2: '2nd Month (Feb/May/Aug/Nov)', 3: '3rd Month (Mar/Jun/Sep/Dec)' };
        return `Automated QUARTERLY generation on ${qMonths[selectedQuarterMonth] || 'Month 1'}, Day ${selectedDayOfMonth}. Window: ${offset} ETA days.`;
      }
      case 'ANNUAL': {
        const mNames = { JAN: 'January', FEB: 'February', MAR: 'March', APR: 'April', MAY: 'May', JUN: 'June', JUL: 'July', AUG: 'August', SEP: 'September', OCT: 'October', NOV: 'November', DEC: 'December' };
        return `Automated ANNUAL generation every year on ${mNames[selectedAnnualMonth] || selectedAnnualMonth} ${selectedDayOfMonth}. Window: ${offset} ETA days.`;
      }
      case 'DAILY':
        return `Automated DAILY generation (${selectedDailyMode === 'BUSINESS_DAYS' ? 'Business Days Mon-Fri' : 'All 7 Calendar Days'}). Window: ${offset} ETA days.`;
      default:
        return `Automated ${frequency} schedule generation. Window: ${offset} ETA days.`;
    }
  };

  useEffect(() => {
    setLocalUserMap((prev) => ({ ...prev, ...userMap }));
  }, [userMap]);

  // Pre-fill state when resuming an existing draft template from backend API
  useEffect(() => {
    if (isOpen) {
      if (editingTemplate) {
        const targetId = editingTemplate.templateId || editingTemplate.id || null;
        setTemplateId(targetId);

        // Pre-fill from editingTemplate props first for instant UI response
        reset({
          sopCode: editingTemplate.templateCode || editingTemplate.sopCode || editingTemplate.code || '',
          title: editingTemplate.title || editingTemplate.name || '',
          description: editingTemplate.description || '',
          processCategory: editingTemplate.processCategory || editingTemplate.process || '',
          entityCode: editingTemplate.entityCode || '',
          effectiveFrom: editingTemplate.effectiveFrom || todayStr,
          effectiveUntil: editingTemplate.effectiveUntil || '',
          frequency: editingTemplate.frequency || 'MONTHLY',
          dueDayOffset: editingTemplate.dueDayOffset !== undefined ? editingTemplate.dueDayOffset : 15,
          isRecurring: editingTemplate.isRecurring !== undefined ? editingTemplate.isRecurring : true,
          defaultMakerIds: editingTemplate.defaultMakerIds || editingTemplate.makers || [],
          defaultCheckerIds: editingTemplate.defaultCheckerIds || editingTemplate.checkers || [],
        });

        if (editingTemplate.recurrenceConfig) {
          try {
            const parsed = typeof editingTemplate.recurrenceConfig === 'string'
              ? JSON.parse(editingTemplate.recurrenceConfig)
              : editingTemplate.recurrenceConfig;
            if (Array.isArray(parsed.weekdays)) setSelectedWeekDays(parsed.weekdays);
            if (parsed.dayOfMonth) setSelectedDayOfMonth(parsed.dayOfMonth);
            if (parsed.quarterMonth) setSelectedQuarterMonth(parsed.quarterMonth);
            if (parsed.monthOfYear) setSelectedAnnualMonth(parsed.monthOfYear);
            if (parsed.dailyMode) setSelectedDailyMode(parsed.dailyMode);
          } catch (e) {}
        }

        const rawTasks = editingTemplate.taskTemplates || [];
        if (Array.isArray(rawTasks) && rawTasks.length > 0) {
          const mappedTasks = rawTasks.map((t, idx) => ({
            id: t.taskTemplateId || `task-template-${Date.now()}-${idx}`,
            taskTemplateId: t.taskTemplateId,
            stepSequence: t.stepSequence || idx + 1,
            title: t.taskName || t.title || '',
            description: t.description || '',
            dependencyMode: t.dependencyMode || (idx === 0 ? 'INDEPENDENT' : 'DEPENDENT_ON_PREVIOUS'),
            priority: t.priority || 'Medium',
            etaStartDay: t.etaStartDay !== undefined ? t.etaStartDay : 0,
            etaEndDay: t.etaEndDay !== undefined ? t.etaEndDay : 7,
            slaHours: t.slaHours !== undefined ? t.slaHours : 24,
            makers: t.makerIds || t.makers || [],
            checkers: t.checkerIds || t.checkers || [],
            requiredDocs: t.requiredDocumentNames || t.requiredDocuments || t.requiredDocs || [],
            savedToBackend: true,
          }));
          setTaskTemplates(mappedTasks);
          setCurrentStep(2);
        } else {
          setTaskTemplates([]);
          setCurrentStep(1);
        }

        // Fetch complete, authoritative draft state from GET /finsop/v1/sop-templates/{templateId}
        if (targetId) {
          getSopTemplate(targetId)
            .then((res) => {
              const full = res?.data || res;
              if (full && (full.templateId || full.id)) {
                reset({
                  sopCode: full.templateCode || full.sopCode || '',
                  title: full.title || full.name || '',
                  description: full.description || '',
                  processCategory: full.processCategory || full.process || '',
                  entityCode: full.entityCode || '',
                  effectiveFrom: full.effectiveFrom || todayStr,
                  effectiveUntil: full.effectiveUntil || '',
                  frequency: full.frequency || 'MONTHLY',
                  dueDayOffset: full.dueDayOffset !== undefined ? full.dueDayOffset : 15,
                  isRecurring: full.isRecurring !== undefined ? full.isRecurring : true,
                  defaultMakerIds: full.defaultMakerIds || [],
                  defaultCheckerIds: full.defaultCheckerIds || [],
                });

                if (full.recurrenceConfig) {
                  try {
                    const parsed = typeof full.recurrenceConfig === 'string'
                      ? JSON.parse(full.recurrenceConfig)
                      : full.recurrenceConfig;
                    if (Array.isArray(parsed.weekdays)) setSelectedWeekDays(parsed.weekdays);
                    if (parsed.dayOfMonth) setSelectedDayOfMonth(parsed.dayOfMonth);
                    if (parsed.quarterMonth) setSelectedQuarterMonth(parsed.quarterMonth);
                    if (parsed.monthOfYear) setSelectedAnnualMonth(parsed.monthOfYear);
                    if (parsed.dailyMode) setSelectedDailyMode(parsed.dailyMode);
                  } catch (e) {}
                }

                const fetchedTasks = full.taskTemplates || [];
                if (Array.isArray(fetchedTasks) && fetchedTasks.length > 0) {
                  const mapped = fetchedTasks.map((t, idx) => ({
                    id: t.taskTemplateId || `task-template-${Date.now()}-${idx}`,
                    taskTemplateId: t.taskTemplateId,
                    stepSequence: t.stepSequence || idx + 1,
                    title: t.taskName || t.title || '',
                    description: t.description || '',
                    dependencyMode: t.dependencyMode || (idx === 0 ? 'INDEPENDENT' : 'DEPENDENT_ON_PREVIOUS'),
                    priority: t.priority || 'Medium',
                    etaStartDay: t.etaStartDay !== undefined ? t.etaStartDay : 0,
                    etaEndDay: t.etaEndDay !== undefined ? t.etaEndDay : 7,
                    slaHours: t.slaHours !== undefined ? t.slaHours : 24,
                    makers: t.makerIds || t.makers || [],
                    checkers: t.checkerIds || t.checkers || [],
                    requiredDocs: t.requiredDocumentNames || t.requiredDocuments || t.requiredDocs || [],
                    savedToBackend: true,
                  }));
                  setTaskTemplates(mapped);
                  setCurrentStep(2);
                }
              }
            })
            .catch((err) => {
              console.error('Failed to fetch complete draft SOP template from API:', err);
            });
        }
      } else {
        setTemplateId(null);
        setTaskTemplates([]);
        setCurrentStep(1);
        reset({
          sopCode: '',
          title: '',
          description: '',
          processCategory: '',
          entityCode: '',
          effectiveFrom: todayStr,
          effectiveUntil: '',
          frequency: 'MONTHLY',
          dueDayOffset: 15,
          isRecurring: true,
          defaultMakerIds: [],
          defaultCheckerIds: [],
        });
      }
    }
  }, [isOpen, editingTemplate, reset, todayStr]);

  // Load process categories dynamically from backend API (creatable categories for non-admin user)
  useEffect(() => {
    if (isOpen) {
      const targetUid = currentUser?.id || currentUser?.userId || currentUser?.email;
      if (isAdmin) {
        getProcessCategories()
          .then((cats) => {
            if (Array.isArray(cats) && cats.length > 0) {
              const available = cats.map((c) => ({
                value: c.categoryName || c.categoryCode || c,
                label: c.categoryName || c.categoryCode || c,
              }));
              setProcessOptions(available);
              const currentCat = getValues('processCategory');
              if (!currentCat || !available.some((o) => o.value === currentCat)) {
                setValue('processCategory', available[0].value);
              }
            }
          })
          .catch(() => {});
      } else if (targetUid) {
        getUserCreatableCategories(targetUid)
          .then((cats) => {
            const list = Array.isArray(cats) ? cats : (cats?.data || []);
            if (list.length > 0) {
              const available = list.map((c) => ({
                value: typeof c === 'string' ? c : (c.categoryName || c.categoryCode || c),
                label: typeof c === 'string' ? c : (c.categoryName || c.categoryCode || c),
              }));
              setProcessOptions(available);
              const currentCat = getValues('processCategory');
              if (!currentCat || !available.some((o) => o.value === currentCat)) {
                setValue('processCategory', available[0].value);
              }
            } else {
              setProcessOptions([]);
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, isAdmin, currentUser, setValue, getValues]);

  // Load corporate entities dynamically from backend API
  useEffect(() => {
    if (isOpen) {
      fetchEntities()
        .then((entities) => {
          if (Array.isArray(entities) && entities.length > 0) {
            const opts = entities.map((e) => ({
              value: e.entityCode || e.id || e.value,
              label: e.entityName || e.label || e.name || e.id,
            }));
            setEntityOptions(opts);
            const currentEntity = getValues('entityCode');
            if (!currentEntity || !opts.some((o) => o.value === currentEntity)) {
              setValue('entityCode', opts[0].value);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, setValue, getValues]);

  const loadPermittedUsers = useCallback(
    async (category) => {
      if (!category) return;
      setLoadingUsers(true);
      try {
        const [makers, checkers] = await Promise.all([
          getUsersByPermission(category, 'MAKER'),
          getUsersByPermission(category, 'CHECKER'),
        ]);
        const makerList = Array.isArray(makers) ? makers : [];
        const checkerList = Array.isArray(checkers) ? checkers : [];

        setPermittedMakers(makerList);
        setPermittedCheckers(checkerList);

        // Update local user map with full names of permitted users
        setLocalUserMap((prev) => {
          const map = { ...prev };
          makerList.forEach((u) => { if (u.id) map[u.id] = u.name || u.id; });
          checkerList.forEach((u) => { if (u.id) map[u.id] = u.name || u.id; });
          return map;
        });

        // Do NOT auto-select default makers/checkers — user manually selects from permitted pool!
      } catch (err) {
        console.error('Failed to load permitted users for category:', category, err);
        setPermittedMakers([]);
        setPermittedCheckers([]);
        setValue('defaultMakerIds', [], { shouldValidate: true });
        setValue('defaultCheckerIds', [], { shouldValidate: true });
      } finally {
        setLoadingUsers(false);
      }
    },
    [setValue]
  );

  // Trigger getUsersByPermission whenever processCategory changes or drawer opens
  const prevCategoryRef = React.useRef(processCategory);
  useEffect(() => {
    if (isOpen && processCategory) {
      if (prevCategoryRef.current !== processCategory) {
        setValue('defaultMakerIds', [], { shouldValidate: false });
        setValue('defaultCheckerIds', [], { shouldValidate: false });
        prevCategoryRef.current = processCategory;
      }
      loadPermittedUsers(processCategory);
    }
  }, [isOpen, processCategory, loadPermittedUsers, setValue]);

  const handleProceedToStep2 = async () => {
    if (isViewOnly) {
      setCurrentStep(2);
      return;
    }
    setErrorMsg('');
    const isValid = await trigger();
    if (!isValid) return;

    setIsSavingDraft(true);
    try {
      const formData = getValues();
      const recurrenceConfigObj = {
        mode: isRecurring ? 'RECURRING' : 'ONE_TIME',
        frequency,
        weekdays: selectedWeekDays,
        dayOfWeek: selectedWeekDays[0] || 'MON',
        dayOfMonth: selectedDayOfMonth,
        quarterMonth: selectedQuarterMonth,
        monthOfYear: selectedAnnualMonth,
        dailyMode: selectedDailyMode,
      };

      const payload = {
        templateCode: formData.sopCode,
        title: formData.title,
        description: formData.description,
        processCategory: formData.processCategory,
        entityCode: formData.entityCode,
        frequency: formData.frequency,
        dueDayOffset: Number(formData.dueDayOffset) || 0,
        isRecurring: formData.isRecurring,
        recurrenceConfig: JSON.stringify(recurrenceConfigObj),
        effectiveFrom: formData.effectiveFrom,
        effectiveUntil: formData.effectiveUntil || null,
        defaultMakerIds: formData.defaultMakerIds,
        defaultCheckerIds: formData.defaultCheckerIds,
        createdById: currentUser?.id || currentUser?.userId || currentUser?.email || 'usr-manoj-042',
      };

      if (!templateId) {
        const res = await createSopTemplate(payload);
        const createdId = res.data?.templateId || res.templateId || res.data?.id;
        setTemplateId(createdId);
      } else {
        await updateSopTemplate(templateId, payload);
      }
      setCurrentStep(2);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save SOP Template Draft.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleProceedToStep3 = async () => {
    if (isViewOnly) {
      setCurrentStep(3);
      return;
    }
    if (taskTemplates.length === 0) {
      setErrorMsg('You must add at least one task template step to the execution flow.');
      return;
    }
    setErrorMsg('');
    setIsSavingDraft(true);
    try {
      let currentTemplateId = templateId;
      if (!currentTemplateId) {
        const formData = getValues();
        const recurrenceConfigObj = {
          mode: isRecurring ? 'RECURRING' : 'ONE_TIME',
          frequency,
          weekdays: selectedWeekDays,
          dayOfWeek: selectedWeekDays[0] || 'MON',
          dayOfMonth: selectedDayOfMonth,
          quarterMonth: selectedQuarterMonth,
          monthOfYear: selectedAnnualMonth,
          dailyMode: selectedDailyMode,
        };

        const payload = {
          templateCode: formData.sopCode,
          title: formData.title,
          description: formData.description,
          processCategory: formData.processCategory,
          entityCode: formData.entityCode,
          frequency: formData.frequency,
          dueDayOffset: Number(formData.dueDayOffset) || 0,
          isRecurring: formData.isRecurring,
          recurrenceConfig: JSON.stringify(recurrenceConfigObj),
          effectiveFrom: formData.effectiveFrom,
          effectiveUntil: formData.effectiveUntil || null,
          defaultMakerIds: formData.defaultMakerIds,
          defaultCheckerIds: formData.defaultCheckerIds,
          createdById: currentUser?.id || currentUser?.userId || currentUser?.email || 'usr-manoj-042',
        };

        const res = await createSopTemplate(payload);
        currentTemplateId = res.data?.templateId || res.templateId || res.data?.id;
        setTemplateId(currentTemplateId);
      }

      const updatedTasks = [...taskTemplates];
      for (let i = 0; i < updatedTasks.length; i++) {
        const task = updatedTasks[i];
        if ((!task.savedToBackend || !task.taskTemplateId) && currentTemplateId) {
          const stepPayload = {
            stepSequence: task.stepSequence || (i + 1),
            taskName: task.title,
            dependencyMode: task.dependencyMode,
            etaStartDay: Number(task.etaStartDay) || 0,
            etaEndDay: Number(task.etaEndDay) || 0,
            slaHours: Number(task.slaHours) || 24,
            priority: task.priority,
            makerIds: task.makers,
            checkerIds: task.checkers,
            requiredDocuments: task.requiredDocs,
          };
          const res = await addTaskTemplateStep(currentTemplateId, stepPayload);
          const tDto = res.data || res;
          if (tDto && Array.isArray(tDto.taskTemplates)) {
            const match = tDto.taskTemplates.find(st => st.stepSequence === task.stepSequence) || tDto.taskTemplates[i];
            if (match?.taskTemplateId) {
              task.taskTemplateId = match.taskTemplateId;
            }
          }
          task.savedToBackend = true;
        }
      }
      setTaskTemplates(updatedTasks);
      setCurrentStep(3);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save Task Template Steps.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (isViewOnly) {
      onClose();
      return;
    }
    setErrorMsg('');
    setIsSavingDraft(true);
    try {
      if (templateId) {
        await submitSopTemplate(templateId, currentUser?.id || currentUser?.userId || 'usr-manoj-042');
      }
      const formData = getValues();
      if (onSuccess) onSuccess(`SOP Blueprint "${formData.title}" submitted for approval successfully! Assigned approver has been notified.`);
      reset();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to submit SOP Blueprint for approval.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const removeMaker = (id) => { if (!isViewOnly) setValue('defaultMakerIds', defaultMakerIds.filter((x) => x !== id), { shouldValidate: true }); };
  const removeChecker = (id) => { if (!isViewOnly) setValue('defaultCheckerIds', defaultCheckerIds.filter((x) => x !== id), { shouldValidate: true }); };

  const handleDeleteTaskTemplate = async (taskId) => {
    if (isViewOnly) return;
    const taskToDelete = taskTemplates.find((t) => t.id === taskId);
    if (taskToDelete?.taskTemplateId && templateId) {
      try {
        await deleteTaskTemplateStep(templateId, taskToDelete.taskTemplateId);
      } catch (err) {
        console.error('Failed to delete task step from backend:', err);
      }
    }
    setTaskTemplates(taskTemplates.filter((t) => t.id !== taskId).map((t, index) => ({ ...t, stepSequence: index + 1 })));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex justify-end bg-slate-900/65 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-[1200px] flex-col bg-slate-50 shadow-2xl transition-transform">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-indigo-900 bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 px-6 py-4 text-white shadow-md">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold tracking-tight text-white">
                {isViewOnly ? 'View SOP Blueprint Template' : 'Create SOP Blueprint Template'}
              </h2>
              {templateId && (
                <span className="rounded-full border border-blue-300/30 bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-mono text-blue-200">
                  Blueprint ID: {templateId}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-indigo-200">
              {isViewOnly
                ? 'Read-only view of master blueprint specifications, schedule rules, and execution steps.'
                : 'Design master blueprints with ETA days and recurring scheduling rules.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/25">✕</button>
        </div>

        {/* Wizard Progress Bar */}
        <div className="flex border-b border-slate-200 bg-white px-7 py-3">
          <div className="flex w-full items-center justify-between">
            <div className={`flex items-center gap-2 transition ${currentStep === 1 ? 'text-blue-600' : currentStep > 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${currentStep === 1 ? 'bg-blue-600 text-white ring-4 ring-blue-100' : currentStep > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <div className="text-left">
                <span className="block text-[10px] font-bold uppercase tracking-wider">Step 1</span>
                <span className="text-xs font-semibold">Blueprint Details</span>
              </div>
            </div>

            <div className={`h-0.5 flex-1 mx-4 ${currentStep > 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

            <div className={`flex items-center gap-2 transition ${currentStep === 2 ? 'text-blue-600' : currentStep > 2 ? 'text-emerald-600' : 'text-slate-400'}`}>
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${currentStep === 2 ? 'bg-blue-600 text-white ring-4 ring-blue-100' : currentStep > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <div className="text-left">
                <span className="block text-[10px] font-bold uppercase tracking-wider">Step 2</span>
                <span className="text-xs font-semibold">Execution Flow & ETAs</span>
              </div>
            </div>

            <div className={`h-0.5 flex-1 mx-4 ${currentStep > 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

            <div className={`flex items-center gap-2 transition ${currentStep === 3 ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${currentStep === 3 ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-slate-200 text-slate-600'}`}>
                3
              </div>
              <div className="text-left">
                <span className="block text-[10px] font-bold uppercase tracking-wider">Step 3</span>
                <span className="text-xs font-semibold">{isViewOnly ? 'Summary' : 'Approval Submission'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {errorMsg && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">{errorMsg}</div>
            )}

            {currentStep === 1 && (
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-7 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                    Blueprint Core Information
                  </h3>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Process Category *</label>
                      <select {...register('processCategory')} disabled={isViewOnly} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-blue-600 focus:outline-none disabled:bg-slate-100">
                        <option value="">-- Select Category --</option>
                        {processOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                      </select>
                      {errors.processCategory && <p className="mt-1 text-[11px] text-red-500">{errors.processCategory.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Corporate Entity *</label>
                      <select {...register('entityCode')} disabled={isViewOnly} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-blue-600 focus:outline-none disabled:bg-slate-100">
                        {entityOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Template Code *</label>
                    <input type="text" {...register('sopCode')} disabled={isViewOnly} className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none disabled:bg-slate-100" />
                    {errors.sopCode && <p className="mt-1 text-[11px] text-red-500">{errors.sopCode.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Blueprint Title *</label>
                    <input type="text" {...register('title')} disabled={isViewOnly} className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none disabled:bg-slate-100" />
                    {errors.title && <p className="mt-1 text-[11px] text-red-500">{errors.title.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Governance Description</label>
                    <textarea rows={3} {...register('description')} disabled={isViewOnly} className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none disabled:bg-slate-100" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-blue-700 mb-1">
                        Effective From *
                      </label>
                      <input
                        type="date"
                        {...register('effectiveFrom')}
                        disabled={isViewOnly}
                        className="w-full rounded-lg border border-blue-400 bg-blue-50/30 p-2.5 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                      />
                      {errors.effectiveFrom && (
                        <p className="mt-1 text-[11px] text-red-500">{errors.effectiveFrom.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                        Effective Until (Optional)
                      </label>
                      <input
                        type="date"
                        {...register('effectiveUntil')}
                        disabled={isViewOnly}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                      />
                    </div>
                  </div>

                </div>

                {/* Right Column: Recurrence Engine & Default Pools */}
                <div className="col-span-6 space-y-5">
                  {/* Recurrence Engine Card */}
                  <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                          Recurrence & Scheduling Engine Rules
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Configure automated SOP generation rules and frequency parameters.
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${isRecurring ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                        {isRecurring ? 'ACTIVE SCHEDULE' : 'ONE-TIME RUN'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Execution Mode</label>
                        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                          <button
                            type="button"
                            disabled={isViewOnly}
                            onClick={() => setValue('isRecurring', true)}
                            className={`rounded-md py-1 text-xs font-bold transition ${isRecurring ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Recurring
                          </button>
                          <button
                            type="button"
                            disabled={isViewOnly}
                            onClick={() => setValue('isRecurring', false)}
                            className={`rounded-md py-1 text-xs font-bold transition ${!isRecurring ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            One-Time
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">SOP Completion Window</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            {...register('dueDayOffset')}
                            disabled={isViewOnly}
                            min={0}
                            max={365}
                            className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-800 focus:border-indigo-600 focus:outline-none disabled:bg-slate-100"
                          />
                          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">ETA Days</span>
                        </div>
                      </div>
                    </div>

                    {isRecurring && (
                      <div className="space-y-3.5 pt-1">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Recurrence Frequency</label>
                          <div className="flex flex-wrap gap-1">
                            {FREQ_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                disabled={isViewOnly}
                                onClick={() => setValue('frequency', opt.value)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${frequency === opt.value ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Contextual Recurrence Controls */}
                        {frequency === 'WEEKLY' && (
                          <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
                            <label className="block text-[10px] font-bold uppercase text-indigo-800">Target Day of Week</label>
                            <div className="flex flex-wrap gap-1">
                              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => {
                                const isSelected = selectedWeekDays.includes(day);
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    disabled={isViewOnly}
                                    onClick={() => {
                                      if (isSelected && selectedWeekDays.length > 1) {
                                        setSelectedWeekDays(selectedWeekDays.filter((d) => d !== day));
                                      } else if (!isSelected) {
                                        setSelectedWeekDays([...selectedWeekDays, day]);
                                      }
                                    }}
                                    className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${isSelected ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {frequency === 'MONTHLY' && (
                          <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
                            <label className="block text-[10px] font-bold uppercase text-indigo-800">Day of Month</label>
                            <div className="flex flex-wrap gap-1.5">
                              {[1, 5, 10, 15, 20, 25, 30].map((dayNum) => (
                                <button
                                  key={dayNum}
                                  type="button"
                                  disabled={isViewOnly}
                                  onClick={() => setSelectedDayOfMonth(dayNum)}
                                  className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${selectedDayOfMonth === dayNum ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                  Day {dayNum}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {frequency === 'QUARTERLY' && (
                          <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-indigo-800 mb-1">Quarter Month</label>
                              <select
                                value={selectedQuarterMonth}
                                disabled={isViewOnly}
                                onChange={(e) => setSelectedQuarterMonth(Number(e.target.value))}
                                className="w-full rounded-md border border-slate-300 bg-white p-1.5 text-xs font-bold text-slate-800 outline-none disabled:bg-slate-100"
                              >
                                <option value={1}>1st Month (Jan / Apr / Jul / Oct)</option>
                                <option value={2}>2nd Month (Feb / May / Aug / Nov)</option>
                                <option value={3}>3rd Month (Mar / Jun / Sep / Dec)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-indigo-800 mb-1">Day of Month</label>
                              <select
                                value={selectedDayOfMonth}
                                disabled={isViewOnly}
                                onChange={(e) => setSelectedDayOfMonth(Number(e.target.value))}
                                className="w-full rounded-md border border-slate-300 bg-white p-1.5 text-xs font-bold text-slate-800 outline-none disabled:bg-slate-100"
                              >
                                <option value={1}>Day 1 (Start of Month)</option>
                                <option value={15}>Day 15 (Mid Month)</option>
                                <option value={30}>Day 30 (End of Month)</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {frequency === 'ANNUAL' && (
                          <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-indigo-800 mb-1">Run Month</label>
                              <select
                                value={selectedAnnualMonth}
                                disabled={isViewOnly}
                                onChange={(e) => setSelectedAnnualMonth(e.target.value)}
                                className="w-full rounded-md border border-slate-300 bg-white p-1.5 text-xs font-bold text-slate-800 outline-none disabled:bg-slate-100"
                              >
                                <option value="JAN">January</option>
                                <option value="FEB">February</option>
                                <option value="MAR">March (Fiscal Year End)</option>
                                <option value="APR">April (Fiscal Year Start)</option>
                                <option value="MAY">May</option>
                                <option value="JUN">June</option>
                                <option value="JUL">July</option>
                                <option value="AUG">August</option>
                                <option value="SEP">September</option>
                                <option value="OCT">October</option>
                                <option value="NOV">November</option>
                                <option value="DEC">December</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-indigo-800 mb-1">Day of Month</label>
                              <select
                                value={selectedDayOfMonth}
                                disabled={isViewOnly}
                                onChange={(e) => setSelectedDayOfMonth(Number(e.target.value))}
                                className="w-full rounded-md border border-slate-300 bg-white p-1.5 text-xs font-bold text-slate-800 outline-none disabled:bg-slate-100"
                              >
                                <option value={1}>Day 1</option>
                                <option value={15}>Day 15</option>
                                <option value={31}>Day 31 / Last Day</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {frequency === 'DAILY' && (
                          <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
                            <label className="block text-[10px] font-bold uppercase text-indigo-800">Daily Execution Pattern</label>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                disabled={isViewOnly}
                                onClick={() => setSelectedDailyMode('BUSINESS_DAYS')}
                                className={`rounded-md p-1.5 text-xs font-bold transition ${selectedDailyMode === 'BUSINESS_DAYS' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'}`}
                              >
                                Business Days (Mon-Fri)
                              </button>
                              <button
                                type="button"
                                disabled={isViewOnly}
                                onClick={() => setSelectedDailyMode('ALL_DAYS')}
                                className={`rounded-md p-1.5 text-xs font-bold transition ${selectedDailyMode === 'ALL_DAYS' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600'}`}
                              >
                                All 7 Calendar Days
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Live Schedule Rule Summary Card */}
                    <div className="rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-3 text-[11px] font-semibold text-indigo-900 shadow-inner">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-extrabold uppercase text-[10px] tracking-wider text-indigo-700">Schedule Rule Preview:</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed font-normal">{getScheduleSummary()}</p>
                    </div>
                  </div>

                  {/* Default Master Pools Card */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                      Default Master Pools
                    </h3>
                    <p className="text-[10px] text-slate-500 leading-relaxed mb-3">
                      Operational users assigned to this SOP Template. Tasks created in Step 2 will inherit these pools.
                    </p>

                    <div className="space-y-3">
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold uppercase text-slate-600">Master Maker Pool *</label>
                          {!isViewOnly && (
                            <button type="button" onClick={() => setShowMakerPicker(true)} className="rounded border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-50">Select ({defaultMakerIds.length})</button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 min-h-[30px]">
                          {defaultMakerIds.map((id) => (
                            <span key={id} className="inline-flex items-center gap-1 rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
                              {localUserMap[id] || id} {!isViewOnly && <button type="button" onClick={() => removeMaker(id)} className="text-slate-400 hover:text-red-500">✕</button>}
                            </span>
                          ))}
                          {errors.defaultMakerIds && <p className="text-[10px] text-red-500 mt-1 w-full">{errors.defaultMakerIds.message}</p>}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold uppercase text-slate-600">Master Checker Pool *</label>
                          {!isViewOnly && (
                            <button type="button" onClick={() => setShowCheckerPicker(true)} className="rounded border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-50">Select ({defaultCheckerIds.length})</button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 min-h-[30px]">
                          {defaultCheckerIds.map((id) => (
                            <span key={id} className="inline-flex items-center gap-1 rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
                              {localUserMap[id] || id} {!isViewOnly && <button type="button" onClick={() => removeChecker(id)} className="text-slate-400 hover:text-red-500">✕</button>}
                            </span>
                          ))}
                          {errors.defaultCheckerIds && <p className="text-[10px] text-red-500 mt-1 w-full">{errors.defaultCheckerIds.message}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: TASK TEMPLATES */}
            {currentStep === 2 && (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm min-h-[500px]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      Execution Step Definitions (ETA Days)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Define task template steps with user-friendly ETA start and deadline days.
                    </p>
                  </div>
                  {!isViewOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTaskStep(null);
                        setShowCreateTaskModal(true);
                      }}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
                    >
                      + Add New Task Step
                    </button>
                  )}
                </div>

                <div className="space-y-4 pt-2 max-w-4xl mx-auto">
                  {taskTemplates.length === 0 ? (
                    <div className="py-20 text-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                      <h4 className="text-sm font-bold text-slate-600">No Task Steps Defined</h4>
                      <p className="text-xs text-slate-400 mt-1 mb-4 max-w-sm mx-auto">
                        {isViewOnly ? 'No execution steps recorded in this blueprint.' : 'Click "Add New Task Step" above to configure the first execution task.'}
                      </p>
                      {!isViewOnly && (
                        <button type="button" onClick={() => setShowCreateTaskModal(true)} className="text-xs font-bold text-indigo-600 hover:underline">
                          Create Step 1 →
                        </button>
                      )}
                    </div>
                  ) : (
                    taskTemplates.map((task, idx) => {
                      const isDependent = task.dependencyMode === 'DEPENDENT_ON_PREVIOUS' && idx > 0;
                      return (
                        <div key={task.id} className="relative">
                          {idx > 0 && (
                            <div className="flex items-center justify-center my-2">
                              <span className="rounded-full bg-slate-200 px-3 py-0.5 text-[10px] font-bold text-slate-600 shadow-sm border border-slate-300">
                                ↓ {isDependent ? `Waits for Step ${idx} Approval` : 'Executes Concurrently'}
                              </span>
                            </div>
                          )}

                          <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
                            <div className="space-y-2 w-full">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-extrabold text-indigo-800">
                                    {task.stepSequence}
                                  </span>
                                  <h4 className="text-sm font-bold text-slate-800">{task.title}</h4>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${task.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {task.priority}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTaskStep(task);
                                      setShowCreateTaskModal(true);
                                    }}
                                    className="rounded border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-sm"
                                  >
                                    {isViewOnly ? 'View Step' : 'Edit Step'}
                                  </button>
                                  {!isViewOnly && (
                                    <button type="button" onClick={() => handleDeleteTaskTemplate(task.id)} className="text-xs font-bold text-slate-400 hover:text-red-500 p-1" title="Delete step">✕</button>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500 pl-8">
                                <span className="flex items-center gap-1"><span className="text-slate-400">ETA Duration:</span> <strong className="text-slate-700">{task.etaEndDay} Days</strong></span>
                                <span className="flex items-center gap-1"><span className="text-slate-400">SLA:</span> <strong className="text-slate-700">{task.slaHours} hrs</strong></span>
                                <span className="flex items-center gap-1"><span className="text-slate-400">Makers:</span> <strong className="text-slate-700">{task.makers.length || defaultMakerIds.length} assigned</strong></span>
                              </div>

                              {task.requiredDocs.length > 0 && (
                                <div className="pl-8 pt-1 flex flex-wrap gap-1">
                                  {task.requiredDocs.map((d) => (
                                    <span key={d} className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{d}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: ACTIVATION & VISUAL GANTT TIMELINE */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Schedule Rules</span>
                      <p className="text-xs font-semibold text-slate-700">{isRecurring ? getValues('frequency') : 'One-Time'}</p>
                      <p className="text-xs text-slate-500">SOP Window: {getValues('dueDayOffset')} ETA days</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Total Workflow</span>
                      <p className="text-xs font-semibold text-slate-700">{taskTemplates.length} Executable Steps</p>
                      <p className="text-xs text-slate-500">Template Blueprint Model</p>
                    </div>
                  </div>
                </div>

                {/* Visual Gantt View (ETA Days Relative Timeline) */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    Visual ETA Gantt Timeline Chart
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <GanttTimelineChart tasks={taskTemplates} dueDayOffset={Number(getValues('dueDayOffset')) || 15} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4 shadow-inner">
            <div className="text-[11px] text-slate-500 font-medium">
              {currentStep === 1 && (isViewOnly ? 'Step 1: Blueprint Specification Details' : 'Step 1: Configure Blueprint and click Save to create template draft.')}
              {currentStep === 2 && `Step 2: ${taskTemplates.length} Task step(s) configured.`}
              {currentStep === 3 && (isViewOnly ? 'Step 3: Review Blueprint Summary' : 'Final Step: Review and Submit for Approval.')}
            </div>

            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                {isViewOnly ? 'Close' : 'Cancel'}
              </button>

              {currentStep === 1 && (
                <button type="button" onClick={handleProceedToStep2} disabled={isSavingDraft} className="rounded-lg bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
                  {isSavingDraft ? 'Creating Draft...' : isViewOnly ? 'Next: Execution Flow →' : 'Save Draft & Continue →'}
                </button>
              )}

              {currentStep === 2 && (
                <>
                  <button type="button" onClick={() => setCurrentStep(1)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    ← Back to Step 1
                  </button>
                  <button type="button" onClick={handleProceedToStep3} disabled={isSavingDraft} className="rounded-lg bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
                    {isSavingDraft ? 'Saving Tasks...' : isViewOnly ? 'Next: Summary →' : 'Save Tasks & Continue →'}
                  </button>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <button type="button" onClick={() => setCurrentStep(2)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    ← Back to Step 2
                  </button>
                  {isViewOnly ? (
                    <button type="button" onClick={onClose} className="rounded-lg bg-slate-800 px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-900">
                      Close View
                    </button>
                  ) : (
                    <button type="button" onClick={handleFinalSubmit} disabled={isSavingDraft} className="rounded-lg bg-emerald-600 px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50">
                      {isSavingDraft ? 'Submitting...' : 'Finalize & Submit for Approval'}
                    </button>
                  )}
                </>
              )}

              {/* If SOP Template is in PENDING_APPROVAL status, render Approve & Reject controls */}
              {editingTemplate?.status === 'PENDING_APPROVAL' && (
                <div className="flex items-center gap-2 border-l border-slate-200 pl-3 ml-1">
                  {!showRejectInput ? (
                    <>
                      <button
                        type="button"
                        onClick={handleApproveSopTemplate}
                        disabled={isProcessingAction}
                        className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        ✓ {isProcessingAction ? 'Approving...' : 'Approve Template'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRejectInput(true)}
                        disabled={isProcessingAction}
                        className="rounded-lg bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        ✕ Reject Template
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Reason for rejection..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="rounded-lg border border-red-300 p-2 text-xs text-slate-800 outline-none focus:border-red-600 min-w-[200px]"
                      />
                      <button
                        type="button"
                        onClick={handleRejectSopTemplate}
                        disabled={isProcessingAction || !rejectionReason.trim()}
                        className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-50"
                      >
                        Confirm Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRejectInput(false)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Step 1 Pool Modals */}
      <UserPickerModal
        isOpen={showMakerPicker}
        title="Select Master Maker Pool"
        targetRole="MAKER"
        selectedUserIds={defaultMakerIds}
        permittedUsers={permittedMakers.map((u) => ({ id: u.id, name: u.name }))}
        onClose={() => setShowMakerPicker(false)}
        onConfirm={(ids) => { setValue('defaultMakerIds', ids, { shouldValidate: true }); setShowMakerPicker(false); }}
      />
      <UserPickerModal
        isOpen={showCheckerPicker}
        title="Select Master Checker Pool"
        targetRole="CHECKER"
        selectedUserIds={defaultCheckerIds}
        permittedUsers={permittedCheckers.map((u) => ({ id: u.id, name: u.name }))}
        onClose={() => setShowCheckerPicker(false)}
        onConfirm={(ids) => { setValue('defaultCheckerIds', ids, { shouldValidate: true }); setShowCheckerPicker(false); }}
      />

      {/* Step 2 Task Creation / Edit Modal */}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
        isViewOnly={isViewOnly}
        onClose={() => {
          setShowCreateTaskModal(false);
          setEditingTaskStep(null);
        }}
        existingTasksCount={taskTemplates.length}
        userMap={localUserMap}
        parentMakerPool={defaultMakerIds}
        parentCheckerPool={defaultCheckerIds}
        editingTask={editingTaskStep}
        onSaveTask={async (savedTask, isEdit) => {
          let updatedTask = { ...savedTask };
          try {
            let activeTemplateId = templateId;
            if (!activeTemplateId) {
              const formData = getValues();
              const recurrenceConfigObj = {
                mode: isRecurring ? 'RECURRING' : 'ONE_TIME',
                frequency,
                weekdays: selectedWeekDays,
                dayOfWeek: selectedWeekDays[0] || 'MON',
                dayOfMonth: selectedDayOfMonth,
                quarterMonth: selectedQuarterMonth,
                monthOfYear: selectedAnnualMonth,
                dailyMode: selectedDailyMode,
              };
              const payload = {
                templateCode: formData.sopCode || `SOP-TMPL-${Date.now()}`,
                title: formData.title || 'Untitled SOP Blueprint',
                description: formData.description || '',
                processCategory: formData.processCategory || 'MONTHLY_CLOSING',
                entityCode: formData.entityCode || 'CORP_HQ',
                frequency: formData.frequency || 'MONTHLY',
                dueDayOffset: Number(formData.dueDayOffset) || 15,
                isRecurring: formData.isRecurring,
                recurrenceConfig: JSON.stringify(recurrenceConfigObj),
                effectiveFrom: formData.effectiveFrom || todayStr,
                effectiveUntil: formData.effectiveUntil || null,
                defaultMakerIds: formData.defaultMakerIds || [],
                defaultCheckerIds: formData.defaultCheckerIds || [],
                createdById: currentUser?.id || currentUser?.userId || currentUser?.email || 'usr-manoj-042',
              };
              const resDraft = await createSopTemplate(payload);
              activeTemplateId = resDraft.data?.templateId || resDraft.templateId || resDraft.data?.id;
              setTemplateId(activeTemplateId);
            }

            if (activeTemplateId) {
              const stepPayload = {
                stepSequence: savedTask.stepSequence,
                taskName: savedTask.title,
                dependencyMode: savedTask.dependencyMode,
                etaStartDay: Number(savedTask.etaStartDay) || 0,
                etaEndDay: Number(savedTask.etaEndDay) || 0,
                slaHours: Number(savedTask.slaHours) || 24,
                priority: savedTask.priority,
                makerIds: savedTask.makers,
                checkerIds: savedTask.checkers,
                requiredDocuments: savedTask.requiredDocs,
              };

              if (isEdit && savedTask.taskTemplateId) {
                await updateTaskTemplateStep(activeTemplateId, savedTask.taskTemplateId, stepPayload);
                updatedTask.savedToBackend = true;
              } else {
                const res = await addTaskTemplateStep(activeTemplateId, stepPayload);
                const tDto = res.data || res;
                if (tDto && Array.isArray(tDto.taskTemplates)) {
                  const match = tDto.taskTemplates.find(st => st.stepSequence === savedTask.stepSequence) || tDto.taskTemplates[tDto.taskTemplates.length - 1];
                  if (match?.taskTemplateId) {
                    updatedTask.taskTemplateId = match.taskTemplateId;
                  }
                }
                updatedTask.savedToBackend = true;
              }
            }
          } catch (err) {
            console.error('Failed to sync task template step to backend:', err);
          }

          if (isEdit) {
            setTaskTemplates((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
          } else {
            setTaskTemplates((prev) => [...prev, updatedTask]);
          }
          setShowCreateTaskModal(false);
          setEditingTaskStep(null);
        }}
      />
    </div>
  );
}

function GanttTimelineChart({ tasks = [], dueDayOffset = 15 }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No task timeline data available. Please append task steps in Step 2.
      </div>
    );
  }

  const maxDays = Math.max(dueDayOffset || 15, ...tasks.map((t) => Number(t.etaEndDay) || 1));

  return (
    <div className="min-w-[650px] space-y-3 font-sans">
      <div className="grid grid-cols-12 border-b border-slate-200 pb-2 text-[10px] font-bold uppercase text-slate-400">
        <div className="col-span-4">Task Step (ETA Relative)</div>
        <div className="col-span-8 relative flex justify-between px-2">
          <span>SOP Start Date</span>
          <span>Relative ETA Timeline</span>
          <span>Day {maxDays} (Period Completion)</span>
        </div>
      </div>

      <div className="relative space-y-2.5">
        {tasks.map((task, idx) => {
          const startPercent = Math.max(0, Math.min(100, ((Number(task.etaStartDay) || 0) / maxDays) * 100));
          const endPercent = Math.max(0, Math.min(100, ((Number(task.etaEndDay) || 0) / maxDays) * 100));
          const widthPercent = Math.max(8, endPercent - startPercent);

          return (
            <div key={task.id || idx} className="grid grid-cols-12 items-center text-xs">
              <div className="col-span-4 truncate pr-2 font-medium text-slate-700 flex items-center gap-1.5">
                <span className="font-bold text-indigo-600">{idx + 1}.</span>
                <span className="truncate font-semibold" title={task.title}>
                  {task.title}
                </span>
              </div>

              <div className="col-span-8 relative h-7 rounded bg-slate-100 flex items-center px-1">
                <div
                  className="absolute h-5 rounded px-2 text-[10px] font-bold text-white flex items-center justify-between shadow-sm bg-gradient-to-r from-blue-600 to-indigo-600 transition-all"
                  style={{
                    left: `${startPercent}%`,
                    width: `${Math.min(widthPercent, 100 - startPercent)}%`,
                    minWidth: '54px',
                  }}
                >
                  <span className="truncate">ETA: {task.etaEndDay} Days</span>
                  {task.requiredDocs?.length > 0 && (
                    <span className="ml-1 rounded bg-black/25 px-1 text-[9px]">
                      Docs: {task.requiredDocs.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}