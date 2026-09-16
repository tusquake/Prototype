import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import UserPickerModal from './UserPickerModal';
import {
  getUsersByPermission,
  createSopTemplate,
  addTaskTemplateStep,
  activateSopTemplate,
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
  }, [isOpen, existingTasksCount]);

  if (!isOpen) return null;

  const handleAddDoc = () => {
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

  const removeMaker = (id) => setTaskMakers(taskMakers.filter((x) => x !== id));
  const removeChecker = (id) => setTaskCheckers(taskCheckers.filter((x) => x !== id));

  const handleSave = () => {
    if (!taskTitle.trim()) {
      setTaskError('Task Name is required.');
      return;
    }
    if (etaStartDay < 0) {
      setTaskError('ETA Target Start Day cannot be negative.');
      return;
    }
    if (etaEndDay < etaStartDay) {
      setTaskError('ETA Completion Deadline Day cannot be earlier than Target Start Day.');
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
      id: `task-template-${Date.now()}`,
      stepSequence: existingTasksCount + 1,
      title: taskTitle.trim(),
      slaHours: Number(slaHours) || 24,
      dependencyMode: existingTasksCount === 0 ? 'INDEPENDENT' : taskDependencyMode,
      priority: taskPriority,
      etaStartDay: Number(etaStartDay) || 0,
      etaEndDay: Number(etaEndDay) || 0,
      requiredDocs: [...taskLevelDocs],
      makers: taskMakers,
      checkers: taskCheckers,
      savedToBackend: false,
    };

    onSaveTask(newTaskTemplate);
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
              Create Step {existingTasksCount + 1} Task Template
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Define blueprint rules & ETA days for this execution step.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {taskError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-600">
              ⚠️ {taskError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Task Template Name *</label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Verify Ledger Entries"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Step Dependency</label>
              <select
                value={taskDependencyMode}
                onChange={(e) => setTaskDependencyMode(e.target.value)}
                disabled={existingTasksCount === 0}
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
                onChange={(e) => setSlaHours(e.target.value)}
                min={1}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Priority Level</label>
            <select
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-blue-600 focus:outline-none"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          {/* User-friendly ETA Days Section */}
          <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">Task Timeline & ETA Days</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-700 mb-1">
                  Target Start Day (ETA) *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Day</span>
                  <input
                    type="number"
                    min={0}
                    value={etaStartDay}
                    onChange={(e) => setEtaStartDay(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-500">Day 0 = SOP Start Date</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase text-blue-800 mb-1">
                  Completion Deadline (ETA) *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-blue-700">Day</span>
                  <input
                    type="number"
                    min={0}
                    value={etaEndDay}
                    onChange={(e) => setEtaEndDay(Number(e.target.value))}
                    className="w-full rounded-lg border border-blue-300 bg-white p-2 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-500">By Day {etaEndDay} of SOP period</span>
              </div>
            </div>
            <div className="rounded bg-white/80 p-2 text-[10px] text-indigo-700 border border-indigo-100 flex items-center gap-1.5">
              💡 <span>E.g. If SOP starts Oct 1: Target Start = Oct 1 (Day {etaStartDay}), Completion Deadline = Oct {1 + (etaEndDay || 0)} (Day {etaEndDay}).</span>
            </div>
          </div>

          {/* Task Level Documents */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Required Task Documents</h4>
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
            <div className="flex flex-wrap gap-2">
              {taskLevelDocs.length === 0 ? (
                <span className="text-[11px] italic text-slate-400">No documents required for this step.</span>
              ) : (
                taskLevelDocs.map((doc) => (
                  <span key={doc} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                    📄 {doc}
                    <button type="button" onClick={() => setTaskLevelDocs(taskLevelDocs.filter((d) => d !== doc))} className="text-blue-400 hover:text-red-500 font-bold">✕</button>
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
                <button type="button" onClick={() => setShowMakerPicker(true)} className="text-[10px] font-bold text-blue-600 hover:underline">Select</button>
              </div>
              <div className="flex flex-wrap gap-1">
                {taskMakers.length === 0 ? (
                  <span className="text-[10px] text-slate-400">Inherit all SOP Makers</span>
                ) : (
                  taskMakers.map((id) => (
                    <span key={id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 border border-slate-200">
                      {userMap[id] || id} <button type="button" onClick={() => removeMaker(id)} className="text-slate-400 hover:text-red-500">✕</button>
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold uppercase text-slate-600">Task Checkers</label>
                <button type="button" onClick={() => setShowCheckerPicker(true)} className="text-[10px] font-bold text-blue-600 hover:underline">Select</button>
              </div>
              <div className="flex flex-wrap gap-1">
                {taskCheckers.length === 0 ? (
                  <span className="text-[10px] text-slate-400">Inherit all SOP Checkers</span>
                ) : (
                  taskCheckers.map((id) => (
                    <span key={id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 border border-slate-200">
                      {userMap[id] || id} <button type="button" onClick={() => removeChecker(id)} className="text-slate-400 hover:text-red-500">✕</button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 p-4 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-white">Cancel</button>
          <button onClick={handleSave} className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700">Save Task Template</button>
        </div>
      </div>

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
    </div>
  );
}

export default function CreateSopDrawer({
  isOpen = true,
  currentUser = { id: 'usr-manoj-042', name: 'Compliance Lead', role: 'ADMIN' },
  userMap = {
    'usr-manoj-042': 'Manoj Compliance Lead (Admin)',
    'usr-tushar-304': 'Tushar Sharma (Maker)',
    'usr-prayasa-410': 'Prayasa Patel (Checker)',
    'usr-2': 'Aarav Sharma',
    'usr-3': 'Priya Patel',
  },
  onClose = () => { },
  onSuccess = () => { },
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [templateId, setTemplateId] = useState(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const [processOptions] = useState([
    { value: 'TAX_AUDIT', label: 'Statutory Tax Audit' },
    { value: 'GST_FILING', label: 'GST Monthly Compliance' },
    { value: 'FINANCIAL_CLOSING', label: 'Financial Closing' },
  ]);
  const [errorMsg, setErrorMsg] = useState('');

  const [showMakerPicker, setShowMakerPicker] = useState(false);
  const [showCheckerPicker, setShowCheckerPicker] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  const [permittedMakers, setPermittedMakers] = useState([
    { id: 'usr-tushar-304', name: 'Tushar Sharma (Maker)' },
    { id: 'usr-2', name: 'Aarav Sharma' },
  ]);
  const [permittedCheckers, setPermittedCheckers] = useState([
    { id: 'usr-prayasa-410', name: 'Prayasa Patel (Checker)' },
    { id: 'usr-3', name: 'Priya Patel' },
  ]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [taskTemplates, setTaskTemplates] = useState([]);

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
      sopCode: 'SOP-TAX-2026-001',
      title: 'Annual Statutory GST Audit Blueprint',
      description: 'Master blueprint for regulatory GST submissions.',
      processCategory: 'GST_FILING',
      entityCode: 'CK_INDIA',
      effectiveFrom: todayStr,
      effectiveUntil: '',
      frequency: 'MONTHLY',
      dueDayOffset: 15,
      isRecurring: true,
      defaultMakerIds: ['usr-tushar-304'],
      defaultCheckerIds: ['usr-prayasa-410'],
    },
  });

  const processCategory = useWatch({ control, name: 'processCategory' });
  const isRecurring = useWatch({ control, name: 'isRecurring' });
  const defaultMakerIds = useWatch({ control, name: 'defaultMakerIds' }) || [];
  const defaultCheckerIds = useWatch({ control, name: 'defaultCheckerIds' }) || [];

  const handleProceedToStep2 = async () => {
    setErrorMsg('');
    const isValid = await trigger();
    if (!isValid) return;

    setIsSavingDraft(true);
    try {
      const formData = getValues();
      const payload = {
        templateCode: formData.sopCode,
        title: formData.title,
        description: formData.description,
        processCategory: formData.processCategory,
        entityCode: formData.entityCode,
        frequency: formData.frequency,
        dueDayOffset: Number(formData.dueDayOffset) || 0,
        isRecurring: formData.isRecurring,
        effectiveFrom: formData.effectiveFrom,
        effectiveUntil: formData.effectiveUntil || null,
        defaultMakerIds: formData.defaultMakerIds,
        defaultCheckerIds: formData.defaultCheckerIds,
      };

      if (!templateId) {
        const res = await createSopTemplate(payload);
        const createdId = res.data?.templateId || res.templateId || res.data?.id;
        setTemplateId(createdId);
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
    if (taskTemplates.length === 0) {
      setErrorMsg('You must add at least one task template step to the execution flow.');
      return;
    }
    setErrorMsg('');
    setIsSavingDraft(true);
    try {
      for (const task of taskTemplates) {
        if (!task.savedToBackend && templateId) {
          const stepPayload = {
            stepSequence: task.stepSequence,
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
          await addTaskTemplateStep(templateId, stepPayload);
          task.savedToBackend = true;
        }
      }
      setCurrentStep(3);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save Task Template Steps.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleFinalSubmit = async () => {
    setErrorMsg('');
    setIsSavingDraft(true);
    try {
      if (templateId) {
        await activateSopTemplate(templateId, currentUser.id || 'usr-manoj-042');
      }
      const formData = getValues();
      if (onSuccess) onSuccess(`SOP Blueprint "${formData.title}" activated successfully!`);
      reset();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to activate SOP Blueprint.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const removeMaker = (id) => setValue('defaultMakerIds', defaultMakerIds.filter((x) => x !== id), { shouldValidate: true });
  const removeChecker = (id) => setValue('defaultCheckerIds', defaultCheckerIds.filter((x) => x !== id), { shouldValidate: true });

  const handleDeleteTaskTemplate = (taskId) => {
    setTaskTemplates(taskTemplates.filter((t) => t.id !== taskId).map((t, index) => ({ ...t, stepSequence: index + 1 })));
  };

  const loadPermittedUsers = useCallback(
    async (category) => {
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
    },
    []
  );

  useEffect(() => {
    if (isOpen && processCategory) {
      loadPermittedUsers(processCategory);
    }
  }, [isOpen, processCategory, loadPermittedUsers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex justify-end bg-slate-900/65 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-[1200px] flex-col bg-slate-50 shadow-2xl transition-transform">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-indigo-900 bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 px-6 py-4 text-white shadow-md">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold tracking-tight text-white">Create SOP Blueprint Template</h2>
              {templateId && (
                <span className="rounded-full border border-blue-300/30 bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-mono text-blue-200">
                  Blueprint ID: {templateId}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-indigo-200">Design master blueprints with ETA days and recurring scheduling rules.</p>
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
                <span className="text-xs font-semibold">Activation</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {errorMsg && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">⚠️ {errorMsg}</div>
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
                      <select {...register('processCategory')} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-blue-600 focus:outline-none">
                        <option value="">-- Select Category --</option>
                        {processOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                      </select>
                      {errors.processCategory && <p className="mt-1 text-[11px] text-red-500">{errors.processCategory.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Corporate Entity *</label>
                      <select {...register('entityCode')} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-blue-600 focus:outline-none">
                        {ENTITY_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Template Code *</label>
                    <input type="text" {...register('sopCode')} className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none" />
                    {errors.sopCode && <p className="mt-1 text-[11px] text-red-500">{errors.sopCode.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Blueprint Title *</label>
                    <input type="text" {...register('title')} className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none" />
                    {errors.title && <p className="mt-1 text-[11px] text-red-500">{errors.title.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Governance Description</label>
                    <textarea rows={3} {...register('description')} className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-blue-700 mb-1">
                        Effective From *
                      </label>
                      <input
                        type="date"
                        {...register('effectiveFrom')}
                        className="w-full rounded-lg border border-blue-400 bg-blue-50/30 p-2.5 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
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
                        className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Recurrence Engine */}
                  <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-800 mb-3">Scheduling Engine Rules</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Mode</label>
                        <button type="button" onClick={() => setValue('isRecurring', !isRecurring)} className={`w-full rounded-lg p-2 text-xs font-bold transition ${isRecurring ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-300 text-slate-700'}`}>
                          {isRecurring ? '🔄 Recurring' : 'One-Time'}
                        </button>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Frequency</label>
                        <Controller name="frequency" control={control} render={({ field }) => (
                          <CustomSelect name={field.name} value={field.value} disabled={!isRecurring} options={FREQ_OPTIONS} onChange={(e) => field.onChange(e.target.value)} />
                        )} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">SOP Completion ETA Days</label>
                        <input type="number" {...register('dueDayOffset')} min={0} max={365} className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none" />
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] text-slate-500 italic">
                      * Scheduled instances will auto-generate tasks based on these frequency rules and completion windows.
                    </p>
                  </div>
                </div>

                {/* Right Column: Default Pools */}
                <div className="col-span-5 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                    Default Master Pools
                  </h3>
                  <p className="text-[10px] text-slate-500 leading-relaxed mb-4">
                    Select the default operational users assigned to this SOP Template. Tasks created in Step 2 will inherit these pools by default.
                  </p>

                  <div className="space-y-4">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold uppercase text-slate-600">Master Maker Pool *</label>
                        <button type="button" onClick={() => setShowMakerPicker(true)} className="rounded border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-50">Select ({defaultMakerIds.length})</button>
                      </div>
                      <div className="flex flex-wrap gap-1 min-h-[30px]">
                        {defaultMakerIds.map((id) => (
                          <span key={id} className="inline-flex items-center gap-1 rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
                            {userMap[id] || id} <button type="button" onClick={() => removeMaker(id)} className="text-slate-400 hover:text-red-500">✕</button>
                          </span>
                        ))}
                        {errors.defaultMakerIds && <p className="text-[10px] text-red-500 mt-1 w-full">{errors.defaultMakerIds.message}</p>}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold uppercase text-slate-600">Master Checker Pool *</label>
                        <button type="button" onClick={() => setShowCheckerPicker(true)} className="rounded border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-50">Select ({defaultCheckerIds.length})</button>
                      </div>
                      <div className="flex flex-wrap gap-1 min-h-[30px]">
                        {defaultCheckerIds.map((id) => (
                          <span key={id} className="inline-flex items-center gap-1 rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
                            {userMap[id] || id} <button type="button" onClick={() => removeChecker(id)} className="text-slate-400 hover:text-red-500">✕</button>
                          </span>
                        ))}
                        {errors.defaultCheckerIds && <p className="text-[10px] text-red-500 mt-1 w-full">{errors.defaultCheckerIds.message}</p>}
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
                  <button
                    type="button"
                    onClick={() => setShowCreateTaskModal(true)}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
                  >
                    + Add New Task Step
                  </button>
                </div>

                <div className="space-y-4 pt-2 max-w-4xl mx-auto">
                  {taskTemplates.length === 0 ? (
                    <div className="py-20 text-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                      <h4 className="text-sm font-bold text-slate-600">No Task Steps Defined</h4>
                      <p className="text-xs text-slate-400 mt-1 mb-4 max-w-sm mx-auto">
                        Click "Add New Task Step" above to configure the first execution task.
                      </p>
                      <button type="button" onClick={() => setShowCreateTaskModal(true)} className="text-xs font-bold text-indigo-600 hover:underline">
                        Create Step 1 →
                      </button>
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
                                <button type="button" onClick={() => handleDeleteTaskTemplate(task.id)} className="text-xs font-bold text-slate-400 hover:text-red-500 p-1">✕</button>
                              </div>

                              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500 pl-8">
                                <span className="flex items-center gap-1"><span className="text-slate-400">⏱️ ETA Target Start:</span> <strong className="text-slate-700">Day {task.etaStartDay}</strong></span>
                                <span className="flex items-center gap-1"><span className="text-slate-400">📅 ETA Deadline:</span> <strong className="text-slate-700">Day {task.etaEndDay}</strong></span>
                                <span className="flex items-center gap-1"><span className="text-slate-400">⌛ SLA:</span> <strong className="text-slate-700">{task.slaHours} hrs</strong></span>
                                <span className="flex items-center gap-1"><span className="text-slate-400">👤 Makers:</span> <strong className="text-slate-700">{task.makers.length || defaultMakerIds.length} assigned</strong></span>
                              </div>

                              {task.requiredDocs.length > 0 && (
                                <div className="pl-8 pt-1 flex flex-wrap gap-1">
                                  {task.requiredDocs.map((d) => (
                                    <span key={d} className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">📄 {d}</span>
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
                    📊 Visual ETA Gantt Timeline Chart
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
              {currentStep === 1 && 'Step 1: Configure Blueprint and click Save to create template draft.'}
              {currentStep === 2 && `Step 2: ${taskTemplates.length} Task step(s) configured.`}
              {currentStep === 3 && 'Final Step: Review and Activate.'}
            </div>

            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>

              {currentStep === 1 && (
                <button type="button" onClick={handleProceedToStep2} disabled={isSavingDraft} className="rounded-lg bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
                  {isSavingDraft ? 'Creating Draft...' : 'Save Draft & Continue →'}
                </button>
              )}

              {currentStep === 2 && (
                <>
                  <button type="button" onClick={() => setCurrentStep(1)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    ← Back to Step 1
                  </button>
                  <button type="button" onClick={handleProceedToStep3} disabled={isSavingDraft} className="rounded-lg bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
                    {isSavingDraft ? 'Saving Tasks...' : 'Save Tasks & Continue →'}
                  </button>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <button type="button" onClick={() => setCurrentStep(2)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    ← Back to Step 2
                  </button>
                  <button type="button" onClick={handleFinalSubmit} disabled={isSavingDraft} className="rounded-lg bg-emerald-600 px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50">
                    {isSavingDraft ? 'Activating...' : 'Finalize & Activate SOP Blueprint'}
                  </button>
                </>
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

      {/* Step 2 Task Creation Modal */}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        existingTasksCount={taskTemplates.length}
        userMap={userMap}
        parentMakerPool={defaultMakerIds}
        parentCheckerPool={defaultCheckerIds}
        onSaveTask={(newTask) => {
          setTaskTemplates([...taskTemplates, newTask]);
          setShowCreateTaskModal(false);
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
          <span>Day 0 (SOP Start)</span>
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
                  <span className="truncate">Day {task.etaStartDay} → Day {task.etaEndDay}</span>
                  {task.requiredDocs?.length > 0 && (
                    <span className="ml-1 rounded bg-black/25 px-1 text-[9px]">
                      📄{task.requiredDocs.length}
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