/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import UserPickerModal from './UserPickerModal';
import CustomDatePicker from './CustomDatePicker';
import ActionConfirmationModal from './ActionConfirmationModal';
import {
  getUsersByPermission,
  getProcessCategories,
  getUserCreatableCategories,
  getUserAccessibleCategories,
  fetchEntities,
  createSopTemplate,
  updateSopTemplate,
  addTaskTemplateStep,
  updateTaskTemplateStep,
  deleteTaskTemplateStep,
  submitSopTemplate,
  activateSopTemplate,
  actionSopTemplate,
  getSopTemplate,
} from '../services/api'; // Ensure your mock/real API supports these calls
import CreateTaskTemplateModal from './CreateTaskTemplateModal';
import ConfirmationModal from './ConfirmationModal';

const MODAL_STEPS = [
  {
    stepNumber: 1,
    title: "Template Definition",
  },
  {
    stepNumber: 2,
    title: "Execution Flow",
  },
  {
    stepNumber: 3,
    title: "Representation",
  },
]

const FREQ_OPTIONS = [
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'WEEKLY', label: 'Weekly' },
];

const MAX_DAYS_IN_MONTH = {
  JAN: 31, FEB: 28, MAR: 31, APR: 30, MAY: 31, JUN: 30,
  JUL: 31, AUG: 31, SEP: 30, OCT: 31, NOV: 30, DEC: 31
}

// SCHEMA: Step 1 Template Validation
const step1Schema = z.object({
  sopCode: z.string().trim().min(1, 'Template Code is required.'),
  title: z.string().trim().min(1, 'Template Title is required.'),
  description: z.string().optional(),
  processCategory: z.string().min(1, 'Process Category is required.'),
  entityCode: z.string().min(1, 'Corporate Entity is required.'),
  effectiveFrom: z.string().min(1, 'SOP Start Date is required.'),
  effectiveUntil: z.string().optional(),
  frequency: z.string().default('MONTHLY'),
  dueDayOffset: z.coerce
    .number()
    .min(0, 'Offset must be at least 0')
    .max(365, 'Offset cannot exceed 365 days'),
  isRecurring: z.boolean().default(false),
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

 const getOffsetMax = (freq) => {
    switch (freq) {
      case 'WEEKLY': return 7;
      case 'MONTHLY': return 31;
      case 'QUARTERLY': return 90;
      case 'ANNUAL': return 365;
      default: return 30;
    }
  };

export default function CreateSopDrawer({
  isOpen = true,
  editingTemplate = null,
  isViewOnly = false,
  currentUser = {},
  userMap = {},
  creatableCategories = [],
  onClose = () => { },
  onSuccess = () => { },
}) {
  // Requirement #1: Multi-step tracking
  const [currentStep, setCurrentStep] = useState(1);
  const [templateId, setTemplateId] = useState(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  const [processOptions, setProcessOptions] = useState([]);
  const [entityOptions, setEntityOptions] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Modals for execution pools (SOP Level)
  const [showMakerPicker, setShowMakerPicker] = useState(false);
  const [showCheckerPicker, setShowCheckerPicker] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [editingTaskStep, setEditingTaskStep] = useState(null);

  const [permittedMakers, setPermittedMakers] = useState([{ id: 'usr-2', name: 'Aarav Sharma' }, { id: 'usr-4', name: 'Vikram Singh' }]);
  const [permittedCheckers, setPermittedCheckers] = useState([{ id: 'usr-1', name: 'Compliance Lead' }, { id: 'usr-3', name: 'Priya Patel' }]);
  const [permittedApprovers, setPermittedApprovers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [localUserMap, setLocalUserMap] = useState(userMap);

  const [taskTemplates, setTaskTemplates] = useState([]);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedWeekDays, setSelectedWeekDays] = useState(['MON']);
  const [selectedDayOfMonth, setSelectedDayOfMonth] = useState(15);
  const [selectedQuarterMonth, setSelectedQuarterMonth] = useState(1);
  const [selectedAnnualMonth, setSelectedAnnualMonth] = useState('MAR');
  const [selectedDailyMode, setSelectedDailyMode] = useState('BUSINESS_DAYS');
  const [openConfirmationModal, setOpenConfirmationModal] = useState(false);
  const [modalConfig, setModalConfig] = useState('APPROVE');


  const {
    register,
    handleSubmit,
    control,
    setValue,
    trigger,
    getValues,
    reset,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(step1Schema),
    reValidateMode: 'onChange',
    defaultValues: {
      sopCode: '',
      title: '',
      description: '',
      processCategory: '',
      entityCode: '',
      effectiveFrom: todayStr,
      effectiveUntil: '',
      frequency: 'MONTHLY',
      dueDayOffset: getOffsetMax('MONTHLY')  ?? 31,
      isRecurring: true,
      defaultMakerIds: [],
      defaultCheckerIds: [],
    },
  });

  const processCategory = useWatch({ control, name: 'processCategory' });
  const isRecurring = useWatch({ control, name: 'isRecurring' });
  const frequency = useWatch({ control, name: 'frequency' }) || 'MONTHLY';
  const dueDayOffset = useWatch({ control, name: 'dueDayOffset' });
  const defaultMakerIds = useWatch({ control, name: 'defaultMakerIds' }) || [];
  const defaultCheckerIds = useWatch({ control, name: 'defaultCheckerIds' }) || [];
  const effectiveFrom = useWatch({ control, name: 'effectiveFrom' });
  const effectiveUntil = useWatch({ control, name: 'effectiveUntil' });

  // API Mock function
  const saveTemplateDraftApiCall = async (payload, step) => {
    // In real app: await createCompleteSop(payload) or similar
    return new Promise((resolve) => {
      setTimeout(() => resolve(`temp-id-uuid-${Date.now()}`), 800);
    });
  };

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
        dueDayOffset: Number(formData.dueDayOffset) || 31,
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
        console.log("RES", res)
        const createdId = res.data?.templateId || res.templateId || res.data?.id;
        setTemplateId(createdId);
        console.log("IN API CALL TEMPLATE ID", createdId)

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
      setErrorMsg('You must add at least one task template to the execution flow.');
      return;
    }
    setErrorMsg('');
    setIsSavingDraft(true);
    try {
      // Save Step 2 state (Tasks)
      await saveTemplateDraftApiCall({ templateId, tasks: taskTemplates }, 2);
      setCurrentStep(3);
    } catch (err) {
      setErrorMsg('Failed to save Task Templates.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleApprove = async (comment) => {
    if (editingTemplate && editingTemplate?.status === 'DRAFT' || editingTemplate?.status === 'APPROVED') {
      onClose();
      return;
    }
    setErrorMsg('');
    setIsSavingDraft(true);

    try {
      console.log('HERE TOO')
      if (templateId && editingTemplate?.status == 'PENDING_APPROVAL') {
        //API Call to approve
        await actionSopTemplate(templateId, {
          action: modalConfig === 'APPROVE' ? 'ACTIVE' : 'REJECT',
          actorId: currentUser?.id ?? '',
          comment: comment?.trim() ?? ''
        })
        if (onSuccess && modalConfig == 'APPROVE') onSuccess(`SOP Template "${editingTemplate.title}" approved successfully! `);
        if (onSuccess && modalConfig == 'REJECT') onSuccess(`SOP Template "${editingTemplate.title}" rejected! `);
        reset()
        onClose();
        return;
      }


    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to submit SOP Template for approval.');
    } finally {
      setIsSavingDraft(false);
    }

  }

  const handleFinalSubmit = async () => {
    if (isViewOnly && (editingTemplate?.status === 'DRAFT' || editingTemplate.status === 'APPROVED')) {
      onClose();
      return;
    }
    setErrorMsg('');
    setIsSavingDraft(true);
    try {

      if (templateId && editingTemplate?.status === 'PENDING_APPROVAL') {
        //API Call to approve
        onClose();
        return;
      }

      if (templateId) {
        await actionSopTemplate(templateId, {
          action: 'SUBMIT',
          actorId: currentUser?.id ?? '',
          comment: ''
        });
      }

      const formData = getValues();

      if (onSuccess) onSuccess(`SOP Template "${formData.title}" submitted for approval successfully! Assigned approver has been notified.`);
      reset();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to submit SOP Template for approval.');
    } finally {
      setIsSavingDraft(false);
    }
  };


  const removeMaker = (id) => setValue('defaultMakerIds', defaultMakerIds.filter((x) => x !== id), { shouldValidate: true });
  const removeChecker = (id) => setValue('defaultCheckerIds', defaultCheckerIds.filter((x) => x !== id), { shouldValidate: true });

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
    setTaskTemplates(taskTemplates.filter(t => t.id !== taskId).map((t, index) => ({ ...t, stepSequence: index + 1 })));
  };

  const loadPermittedUsers = useCallback(
    async (category) => {
      if (!category) return;
      setLoadingUsers(true);

      try {
        const [makers, checkers, approvers] = await Promise.all([
          getUsersByPermission(category, 'MAKER'),
          getUsersByPermission(category, 'CHECKER'),
          getUsersByPermission(category, 'APPROVER'),
        ]);
        setPermittedMakers(makers || []);
        setPermittedCheckers(checkers || []);
        setPermittedApprovers(approvers || []);
      } catch {
        setPermittedMakers([]);
        setPermittedCheckers([]);
        setPermittedApprovers([]);
      } finally {
        setLoadingUsers(false);
      }
    },
    [setValue]
  );

  const isCategoryApprover = useMemo(() => {
    if (isAdmin) return true;
    const uid = currentUser?.id || currentUser?.userId || currentUser?.email;
    const uName = currentUser?.name || currentUser?.fullName;

    // 1. Check template assigned approver fields
    const assignedIds = editingTemplate?.assignedApproverIds || [];
    const assignedNames = editingTemplate?.assignedApproverNames || [];
    if (uid && (assignedIds.includes(uid) || editingTemplate?.assignedApproverId === uid)) return true;
    if (uName && assignedNames.includes(uName)) return true;

    // 2. Check category permission assigned approvers
    if (uid && permittedApprovers.some(a => a.id === uid || a.userId === uid || a.email === uid)) return true;
    if (uName && permittedApprovers.some(a => a.name === uName || a.fullName === uName)) return true;

    return false;
  }, [isAdmin, currentUser, editingTemplate, permittedApprovers]);

  const getScheduleSummary = () => {
    if (!isRecurring) {
      return 'Manual One-Time execution: Instance tasks will generate once upon explicit manual trigger.';
    }
    const offset = dueDayOffset || 31;
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

  // 1. New state for the Autoconfigure toggle
  const [isManualOffset, setIsManualOffset] = useState(false);

  // 2. Helper to get dynamic max offset based on frequency

  // 3. Helper to get exact days in a month for the Annual view
  const getDaysForAnnualMonth = (monthStr) => {
    const monthDaysMap = {
      JAN: 31, FEB: 29, MAR: 31, APR: 30, MAY: 31, JUN: 30,
      JUL: 31, AUG: 31, SEP: 30, OCT: 31, NOV: 30, DEC: 31
    };
    const maxDays = monthDaysMap[monthStr] || 31;
    return Array.from({ length: maxDays }, (_, i) => i + 1);
  };

  useEffect(() => {
    setLocalUserMap((prev) => ({ ...prev, ...userMap }));
  }, [userMap]);

  // Pre-fill state when resuming an existing draft template from backend API
  useEffect(() => {
    if (isOpen) {
      if (editingTemplate) {
        console.log('EdIt', editingTemplate)
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
          dueDayOffset: editingTemplate.dueDayOffset !== undefined ? editingTemplate.dueDayOffset : getOffsetMax(editingTemplate.frequency),
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
          } catch (e) { }
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
          setCurrentStep(1);
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
                  dueDayOffset: full.dueDayOffset !== undefined ? full.dueDayOffset : 31,
                  isRecurring: full.isRecurring !== undefined ? full.isRecurring : true,
                  defaultMakerIds: full.defaultMakerIds || full.makerIds || full.makers || [],
                  defaultCheckerIds: full.defaultCheckerIds || full.checkerIds || full.checkers || [],
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
                  } catch (e) { }
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
          dueDayOffset: 31,
          isRecurring: true,
          defaultMakerIds: [],
          defaultCheckerIds: [],
        });
      }
    }
  }, [isOpen, editingTemplate, reset, todayStr]);

  // Load process categories dynamically from backend API
  useEffect(() => {
    if (isOpen) {
      const targetUid = currentUser?.id || currentUser?.userId || currentUser?.email;
      const templateCat = editingTemplate?.processCategory || editingTemplate?.process || '';

      const applyOptions = (cats) => {
        const list = Array.isArray(cats) ? cats : (cats?.data || []);
        let available = list.map((c) => ({
          value: typeof c === 'string' ? c : (c.categoryCode || c.categoryName || c),
          label: typeof c === 'string' ? c : (c.categoryName || c.categoryCode || c),
        })).filter(o => o.value);

        if (templateCat && !available.some((o) => o.value === templateCat)) {
          available.unshift({ value: templateCat, label: templateCat });
        }

        setProcessOptions(available);

        const currentCat = getValues('processCategory');
        if (!currentCat && available.length > 0) {
          setValue('processCategory', available[0].value);
        } else if (templateCat) {
          setValue('processCategory', templateCat);
        }
      };

      if (isAdmin) {
        getProcessCategories()
          .then(applyOptions)
          .catch(() => {
            if (templateCat) setProcessOptions([{ value: templateCat, label: templateCat }]);
          });
      } else if (targetUid) {
        // Fetch accessible or creatable categories for non-admin
        getUserAccessibleCategories(targetUid)
          .then(applyOptions)
          .catch(() => {
            getUserCreatableCategories(targetUid)
              .then(applyOptions)
              .catch(() => {
                if (templateCat) setProcessOptions([{ value: templateCat, label: templateCat }]);
              });
          });
      } else if (templateCat) {
        setProcessOptions([{ value: templateCat, label: templateCat }]);
        setValue('processCategory', templateCat);
      }
    }
  }, [isOpen, isAdmin, currentUser, editingTemplate, setValue, getValues]);

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
        .catch(() => { });
    }
  }, [isOpen, setValue, getValues]);


  useEffect(() => {
    if (isOpen && processCategory) {
      loadPermittedUsers(processCategory);
    }
  }, [isOpen, processCategory, loadPermittedUsers]);

  if (!isOpen) return null;

  console.log('Default maker ids', defaultMakerIds)

  return (
    <div className="fixed inset-0 z-[1100] flex justify-end bg-slate-900/65 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-[1200px] flex-col bg-slate-50 shadow-2xl transition-transform">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-indigo-900 bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 px-6 py-4 text-white shadow-md">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold tracking-tight text-white">Create SOP Template</h2>
              {templateId && (
                <span className="rounded-full border border-blue-300/30 bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-mono text-blue-200">
                  Draft ID: {templateId}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-indigo-200">Design the SOP Template and recurring scheduling rules.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/25">✕</button>
        </div>

        {/* Wizard Progress Bar */}

        <div className="flex border-b border-slate-200 bg-white px-7 py-3">
          <div className="flex w-full items-center justify-between">

            {MODAL_STEPS?.length > 0 && MODAL_STEPS?.map((step, idx) => {
              const isLast = idx == MODAL_STEPS?.length - 1;
              return (
                <>
                  <div key={step.stepNumber}
                    className={`flex items-center gap-2 transition ${currentStep === step.stepNumber ? 'text-blue-600' : currentStep > step.stepNumber ? 'text-emerald-600' : 'text-slate-400'}`}
                  >
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${currentStep === step.stepNumber ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-slate-200 text-slate-600'}`}>
                      {step.stepNumber}
                    </div>
                    <div className="text-left">
                      <span className="block text-[10px] font-bold uppercase tracking-wider">Step {step.stepNumber}</span>
                      <span className="text-xs font-semibold">{step.title}</span>
                    </div>

                  </div>
                  {!isLast && <div className={`h-0.5 flex-1 mx-4 ${currentStep > step.stepNumber ? 'bg-emerald-500' : 'bg-slate-200'}`} />}

                </>
              )
            })}
          </div>
        </div>


        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {errorMsg && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600"> {errorMsg}</div>
            )}

            {currentStep === 1 && (
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-7 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                    SOP Template Information
                  </h3>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Process Category *</label>
                      <select disabled={isViewOnly} {...register('processCategory')} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-blue-600 focus:outline-none">
                        {processOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                      </select>
                      {errors.processCategory && <p className="mt-1 text-[11px] text-red-500">{errors.processCategory.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Entity *</label>
                      <select disabled={isViewOnly} {...register('entityCode')} className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-blue-600 focus:outline-none">
                        {entityOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">SOP Template Code *</label>
                    <input type="text" disabled={isViewOnly} {...register('sopCode', {
                      onChange: () => clearErrors('sopCode') // Clears error instantly on typing
                    })} className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none" />
                    {errors.sopCode && <p className="mt-1 text-[11px] text-red-500">{errors.sopCode.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">SOP Template Title *</label>
                    <input type="text" disabled={isViewOnly} {...register('title', {
                      onChange: () => clearErrors('title') // Clears error instantly on typing
                    })} className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none" />
                    {errors.title && <p className="mt-1 text-[11px] text-red-500">{errors.title.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Description</label>
                    <textarea rows={3} disabled={isViewOnly} {...register('description')} className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-blue-700 mb-1">
                        SOP Start Date *
                      </label>
                      <Controller
                        control={control}
                        name="effectiveFrom"
                        render={({ field }) => (
                          <CustomDatePicker
                            disabled={isViewOnly}
                            value={field.value}
                            onChange={(date) => {
                              field.onChange(date);
                              clearErrors('effectiveFrom'); // Implemented based on your previous question
                            }}
                            minDate={todayStr} // Prevents selecting a start date AFTER the end date
                            placeholder="Select Start Date"
                          />
                        )}
                      />
                      {errors.effectiveFrom && (
                        <p className="mt-1 text-[11px] text-red-500">{errors.effectiveFrom.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-blue-700 mb-1">
                        SOP End Date
                      </label>
                      <Controller
                        control={control}
                        name="effectiveUntil"
                        render={({ field }) => (
                          <CustomDatePicker
                            disabled={isViewOnly}
                            value={field.value}
                            onChange={(date) => {
                              field.onChange(date);
                              clearErrors('effectiveUntil');
                            }}
                            minDate={effectiveFrom} // Prevents selecting an end date BEFORE the start date
                            placeholder="Select End Date (Optional)"
                          />
                        )}
                      />
                      {errors.effectiveUntil && (
                        <p className="mt-1 text-[11px] text-red-500">{errors.effectiveUntil.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Recurrence Engine */}
                  {/* Recurrence Engine */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Scheduling Engine Rules</h4>
                    </div>

                    <div className="grid grid-cols-12 gap-4">
                      {/* Segmented Control for Execution Mode */}
                      <div className="col-span-5">
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Execution Mode</label>
                        <div className="flex w-full rounded-lg bg-slate-200/70 p-1 shadow-inner">
                          <button
                            type="button"
                            disabled={isViewOnly}
                            onClick={() => setValue('isRecurring', false)}
                            className={`w-1/2 rounded-md py-1.5 text-xs font-bold transition-all duration-200 ${!isRecurring
                              ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-900/5'
                              : 'text-slate-500 hover:text-slate-700'
                              }`}
                          >
                            One-Time
                          </button>
                          <button
                            type="button"
                            disabled={isViewOnly}
                            onClick={() => setValue('isRecurring', true)}
                            className={`flex w-1/2 items-center justify-center gap-1 rounded-md py-1.5 text-xs font-bold transition-all duration-200 ${isRecurring
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                              }`}
                          >
                            Recurring
                          </button>
                        </div>
                      </div>

                      {/* Frequency */}
                      <div className={`col-span-4 transition-opacity duration-200 ${!isRecurring ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Frequency</label>
                        <Controller name="frequency" control={control} render={({ field }) => (
                          <CustomSelect name={field.name} value={field.value} disabled={!isRecurring || isViewOnly} options={FREQ_OPTIONS}
                            onChange={
                              (e) => {
                                const newFrequency = e.target.value;
                                field.onChange(newFrequency);
                                const updatedDueDayOffset = getOffsetMax(newFrequency);                            
                                setValue('dueDayOffset', updatedDueDayOffset, {
                                  shouldValidate: true,
                                  shouldDirty: true
                                });
                              }
                            }
                          />
                        )} />
                      </div>

                      {/* Due Offset with Autoconfigure Toggle */}
                      <div className={`col-span-3 transition-opacity duration-200 ${!isRecurring ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] font-bold uppercase text-slate-500">Due Offset</label>

                          {/* Requirement 1: Autoconfigure Checkbox */}
                          <label className="flex items-center gap-1 text-[9px] font-bold text-blue-700 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={isViewOnly}
                              className="w-3 h-3 rounded border-slate-300 text-blue-600"
                              checked={isManualOffset}
                              onChange={(e) => {
                                setIsManualOffset(e.target.checked);
                                const defaultDayOffset= editingTemplate && editingTemplate.dueDayOffset ? editingTemplate.dueDayOffset : getOffsetMax(frequency);
                                if (!e.target.checked) setValue('dueDayOffset', defaultDayOffset); // Reset if they uncheck
                              }}
                            />
                            Manual
                          </label>
                        </div>

                        {isManualOffset ? (
                          <>
                            <input
                              type="number"
                              {...register('dueDayOffset')}
                              disabled={!isRecurring || isViewOnly}
                              min={1} // Requirement 2: Min is 1
                              max={getOffsetMax(frequency)} // Requirement 2: Dynamic Max
                              className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                            />
                            <p className="mt-1 text-[9px] text-slate-400">Max: {getOffsetMax(frequency)} days</p>
                            {errors.dueDayOffset && <p className="mt-1 text-[10px] text-red-500">{errors.dueDayOffset.message}</p>}
                          </>
                        ) : (
                          <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-400 italic flex items-center justify-center">
                            Auto-configured
                          </div>
                        )}
                      </div>
                    </div>

                    {isRecurring && <div className='mt-2'>

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
                                    // Requirement 4: Single select / toggle logic
                                    if (isSelected) {
                                      setSelectedWeekDays([]); // Deselect if already active
                                    } else {
                                      setSelectedWeekDays([day]); // Select only this day, overriding others
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

                          {/* Requirement 3: 1 to 31 rendered dynamically in a grid */}
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((dayNum) => (
                              <button
                                key={dayNum}
                                type="button"
                                disabled={isViewOnly}
                                onClick={() => setSelectedDayOfMonth(dayNum)}
                                className={`rounded-md py-1 text-xs font-bold transition ${selectedDayOfMonth === dayNum ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                              >
                                {dayNum}
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
                            <div className="grid grid-cols-7 gap-1">
                              {Array.from({ length: 31 }, (_, i) => i + 1).map((dayNum) => (
                                <button
                                  key={dayNum}
                                  type="button"
                                  disabled={isViewOnly}
                                  onClick={() => setSelectedDayOfMonth(dayNum)}
                                  className={`rounded-md py-1 text-xs font-bold transition ${selectedDayOfMonth === dayNum ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                  {dayNum}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {frequency === 'ANNUAL' && (() => {
                        const maxDays = {
                          JAN: 31, FEB: 28, MAR: 31, APR: 30, MAY: 31, JUN: 30,
                          JUL: 31, AUG: 31, SEP: 30, OCT: 31, NOV: 30, DEC: 31
                        }[selectedAnnualMonth] || 31;

                        return (
                          <div className="grid grid-cols-2 gap-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
                            <div>
                              <label className="mb-1 block text-[10px] font-bold uppercase text-indigo-800">Run Month</label>
                              <select
                                value={selectedAnnualMonth}
                                disabled={isViewOnly}
                                onChange={(e) => {
                                  const newMonth = e.target.value;
                                  setSelectedAnnualMonth(newMonth);

                                  // 2. Prevent invalid selections: If current day is 31 and they switch to FEB, change day to 29
                                  const newMaxDays = MAX_DAYS_IN_MONTH[newMonth] ?? 31;

                                  if (selectedDayOfMonth > newMaxDays) {
                                    setSelectedDayOfMonth(newMaxDays);
                                  }
                                }}
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
                              <label className="mb-1 block text-[10px] font-bold uppercase text-indigo-800">Day of Month</label>
                              <div className="grid grid-cols-7 gap-1">
                                {/* 3. Render exact number of days for the selected month */}
                                {Array.from({ length: maxDays }, (_, i) => i + 1).map((dayNum) => (
                                  <button
                                    key={dayNum}
                                    type="button"
                                    disabled={isViewOnly}
                                    onClick={() => setSelectedDayOfMonth(dayNum)}
                                    className={`rounded-md py-1 text-xs font-bold transition ${selectedDayOfMonth === dayNum
                                      ? 'bg-indigo-600 text-white shadow-sm'
                                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50'
                                      }`}
                                  >
                                    {dayNum}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>}

                  </div>
                </div>

                {/* Right Column: Default Pools */}
                <div className="col-span-5 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                    Master Pools
                  </h3>
                  <p className="text-[10px] text-slate-500 leading-relaxed mb-4">
                    Select the operational users assigned to this SOP Template. Tasks created in Step 2 will inherit these pools by default.
                  </p>

                  <div className="space-y-4">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold uppercase text-slate-600">Master Maker Pool *</label>
                        <button type="button" disabled={isViewOnly} onClick={() => setShowMakerPicker(true)} className="rounded border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-50">Select ({defaultMakerIds.length})</button>
                      </div>
                      <div className="flex flex-wrap gap-1 min-h-[30px]">
                        {defaultMakerIds.map((id) => (
                          <span key={id} className="inline-flex items-center gap-1 rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
                            {userMap[id] || id} <button type="button" disabled={isViewOnly} onClick={() => removeMaker(id)} className="text-slate-400 hover:text-red-500">✕</button>
                          </span>
                        ))}
                        {errors.defaultMakerIds && <p className="text-[10px] text-red-500 mt-1 w-full">{errors.defaultMakerIds.message}</p>}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold uppercase text-slate-600">Master Checker Pool *</label>
                        <button type="button" disabled={isViewOnly} onClick={() => setShowCheckerPicker(true)} className="rounded border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-50">Select ({defaultCheckerIds.length})</button>
                      </div>
                      <div className="flex flex-wrap gap-1 min-h-[30px]">
                        {defaultCheckerIds.map((id) => (
                          <span key={id} className="inline-flex items-center gap-1 rounded bg-white border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
                            {userMap[id] || id} <button type="button" disabled={isViewOnly} onClick={() => removeChecker(id)} className="text-slate-400 hover:text-red-500">✕</button>
                          </span>
                        ))}
                        {errors.defaultCheckerIds && <p className="text-[10px] text-red-500 mt-1 w-full">{errors.defaultCheckerIds.message}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}


            {currentStep === 2 && (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm min-h-[500px]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      Execution Step Definitions
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Define the sequential task templates that will be automatically generated upon scheduler trigger.
                    </p>
                  </div>
                  {!isViewOnly && <button
                    type="button"
                    onClick={() => setShowCreateTaskModal(true)}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
                  >
                    + Add New Task Step
                  </button>}

                </div>

                <div className="space-y-4 pt-2 max-w-4xl mx-auto">
                  {taskTemplates.length === 0 ? (
                    <div className="py-20 text-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                      {/* <div className="text-3xl mb-2">📋</div> */}
                      <h4 className="text-sm font-bold text-slate-600">No Task Steps Defined</h4>
                      {!isViewOnly && (<><p className="text-xs text-slate-400 mt-1 mb-4 max-w-sm mx-auto">
                        Click &quot;Add New Task Step&quot; above to configure the first execution task.
                      </p>

                        <button type="button" onClick={() => setShowCreateTaskModal(true)} className="text-xs font-bold text-indigo-600 hover:underline">
                          Create Step 1 →
                        </button> </>)}
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
                                    {isViewOnly ? 'View Task' : 'Edit Task'}
                                  </button>
                                  {!isViewOnly && (
                                    <button type="button" onClick={() => handleDeleteTaskTemplate(task.id)} className="text-xs font-bold text-slate-400 hover:text-red-500 p-1" title="Delete step">✕</button>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500 pl-8">
                                <span className="flex items-center gap-1"><span className="text-slate-400">ETA:</span> <strong className="text-slate-700">{task.etaEndDay} days</strong></span>
                                <span className="flex items-center gap-1"><span className="text-slate-400">Makers:</span> <strong className="text-slate-700">{task.makers.length} assigned</strong></span>
                                <span className="flex items-center gap-1"><span className="text-slate-400">Checkers:</span> <strong className="text-slate-700">{task.checkers.length} assigned</strong></span>
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


            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">


                  <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Schedule Rules</span>
                      <p className="text-xs font-semibold text-slate-700">{isRecurring ? getValues('frequency') : 'One-Time'}</p>
                      <p className="text-xs text-slate-500">ETA: {getValues('dueDayOffset')} days</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Total Workflow</span>
                      <p className="text-xs font-semibold text-slate-700">{taskTemplates.length} Executable Steps</p>
                    </div>
                  </div>
                </div>

                {/* Legacy Gantt PlaceHolder from previous code */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Visual Gantt View (Simulated)</h3>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 opacity-75">
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <GanttTimelineChart tasks={taskTemplates} maxTimeline={dueDayOffset}/>
                      {/* <Willow>
                    <Gantt tasks={tasks} scales={scales} />
                  </Willow> */}

                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4 shadow-inner">
            <div className="text-[11px] text-slate-500 font-medium">
              {currentStep === 1 && 'Step 1: Configure Template and save to proceed.'}
              {currentStep === 2 && `Step 2: ${taskTemplates.length} Tasks configured. Draft saved automatically.`}
              {currentStep === 3 && 'Final Step: Review and Activate.'}
            </div>

            <div className="flex items-center gap-3">
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>

              {currentStep === 1 && (
                <button type="button" onClick={handleProceedToStep2} disabled={isSavingDraft} className="rounded-lg bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
                  {isSavingDraft ? 'Saving Draft...' : isViewOnly ? 'Next: Execution Flow →' : 'Save Draft & Continue →'}
                </button>
              )}

              {currentStep === 2 && (
                <>
                  <button type="button" onClick={() => setCurrentStep(1)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    ← Back to Step 1
                  </button>
                  <button type="button" onClick={handleProceedToStep3} disabled={isSavingDraft} className="rounded-lg bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
                    {isSavingDraft ? 'Saving...' : isViewOnly ? 'Next: Execution Flow →' : 'Save Tasks & Continue →'}
                  </button>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <button type="button" onClick={() => setCurrentStep(2)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    ← Back to Step 2
                  </button>
                  <button type="button" onClick={handleFinalSubmit} className="rounded-lg bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700">
                    {isViewOnly ? 'Close SOP Template' : 'Create SOP Template'}
                  </button>
                </>
              )}

              {editingTemplate?.status === 'PENDING_APPROVAL' && isCategoryApprover && (
                <>
                  <button type="button" onClick={() => {
                    setOpenConfirmationModal(true);
                    setModalConfig('APPROVE');
                  }}
                    className="rounded-lg bg-emerald-600 px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700">
                    Approve
                  </button>

                  <button type="button" onClick={() => {
                    setOpenConfirmationModal(true);
                    setModalConfig('REJECT');
                  }}
                    className="rounded-lg bg-red-600 px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700">
                    Reject
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
        permittedUsers={permittedMakers.map(u => ({ id: u.id, name: u.name }))}
        onClose={() => setShowMakerPicker(false)}
        onConfirm={(ids) => { setValue('defaultMakerIds', ids, { shouldValidate: true }); setShowMakerPicker(false); }}
      />
      <UserPickerModal
        isOpen={showCheckerPicker}
        title="Select Master Checker Pool"
        targetRole="CHECKER"
        selectedUserIds={defaultCheckerIds}
        permittedUsers={permittedCheckers.map(u => ({ id: u.id, name: u.name }))}
        onClose={() => setShowCheckerPicker(false)}
        onConfirm={(ids) => { setValue('defaultCheckerIds', ids, { shouldValidate: true }); setShowCheckerPicker(false); }}
      />

      {/* Step 2 Task Creation Modal */}
      {showCreateTaskModal && <CreateTaskTemplateModal
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
        effectiveUntil={effectiveUntil}
        sopEndDate={effectiveUntil}
        setCurrentStep={setCurrentStep}
        frequency={frequency}
        dueDayOffset={dueDayOffset}
        onSaveTask={async (savedTask, isEdit) => {
          console.log("API CALL 1")
          console.log("Template ID", templateId)
          let updatedTask = { ...savedTask };
          if (templateId) {
            const stepPayload = {
              stepSequence: savedTask.stepSequence,
              taskName: savedTask.title,
              dependencyMode: savedTask.dependencyMode,
              etaStartDay: 0,
              etaEndDay: Number(savedTask.etaEndDay) || 0,
              slaHours: Number(savedTask.slaHours) || 24,
              priority: savedTask.priority,
              makerIds: savedTask.makers,
              checkerIds: savedTask.checkers,
              requiredDocuments: savedTask.requiredDocs,
            };
            try {
              if (isEdit && savedTask.taskTemplateId) {
                await updateTaskTemplateStep(templateId, savedTask.taskTemplateId, stepPayload);
                updatedTask.savedToBackend = true;
              } else {
                console.log("INSIDE ELSE")
                const res = await addTaskTemplateStep(templateId, stepPayload);
                const tDto = res.data || res;
                if (tDto && Array.isArray(tDto.taskTemplates)) {
                  const match = tDto.taskTemplates.find(st => st.stepSequence === savedTask.stepSequence) || tDto.taskTemplates[tDto.taskTemplates.length - 1];
                  if (match?.taskTemplateId) {
                    updatedTask.taskTemplateId = match.taskTemplateId;
                  }
                }
                updatedTask.savedToBackend = true;

              }
            } catch (err) {
              console.error('Failed to sync task template step to backend:', err);
            }
          }

          if (isEdit) {
            setTaskTemplates((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
          } else {
            setTaskTemplates((prev) => [...prev, updatedTask]);
          }
          setShowCreateTaskModal(false);
          setEditingTaskStep(null);
        }}
      />}

      {openConfirmationModal &&
        <ActionConfirmationModal
          isOpen={openConfirmationModal}
          mode={modalConfig}
          title={modalConfig === 'APPROVE' ? "Approve SOP Draft" : "Reject SOP Draft"}
          subtitle={ `Are you sure you want to ${modalConfig === 'APPROVE' ? "approve" : "reject"} sop template: ${editingTemplate?.title} ?`}
          onClose={() => setOpenConfirmationModal(false)}
          onSubmit={(comment) => { handleApprove(comment), setOpenConfirmationModal(false) }}
        />
      }



    </div>
  );
}






function GanttTimelineChart({ tasks = [], maxTimeline }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No task timeline data available. Please append task steps above.
      </div>
    );
  }

  console.log('Tasks',tasks)

  // 1. Process tasks to chain them sequentially safely
  let currentStartDay = 0;
  const computedTasks = tasks.map((task) => {
    const startDay = task.dependencyMode === 'INDEPENDENT' ? 0 : currentStartDay;
    // Assuming etaEndDay is an absolute day. If it's a duration, change this to: startDay + (task.etaEndDay || 0)
    const endDay = Math.max(startDay, task.etaEndDay || startDay);
    
    // Set the start of the next task to the end of this one
    currentStartDay = endDay;

    return { ...task, startDay, endDay };
  });

  // 2. Calculate the max days for the timeline scale
  const lastTaskEndDay = computedTasks[computedTasks.length - 1].endDay;
  
  // Max scale is either the last task, the maxTimeline prop, or at least 1
  const maxDay = Math.max(1, lastTaskEndDay, typeof maxTimeline === 'number' ? maxTimeline : 0);
  const totalDuration = maxDay; // Since minDay is always 0

  // 3. Helper to convert a day offset into a percentage for CSS positioning
  const getPositionPercent = (day) => {
    if (day === undefined || day === null) return 0;
    return Math.max(0, Math.min(100, (day / totalDuration) * 100));
  };

  return (
    <div className="min-w-[650px] space-y-3 font-sans">
      
      {/* Chart Header - FULL WIDTH */}
      <div className="relative flex justify-between border-b border-slate-200 pb-2 px-1 text-[10px] font-bold uppercase text-slate-400">
        <span>Day 0</span>
        <span>Timeline View</span>
        <span>Day {maxDay}</span>
      </div>

      {/* Chart Body - FULL WIDTH */}
      <div className="relative space-y-2">
        {computedTasks.map((task, idx) => {
          const startPercent = getPositionPercent(task.startDay);
          const endPercent = getPositionPercent(task.endDay);
          const widthPercent = endPercent - startPercent;

          return (
            // The track background spans 100% of the width
            <div key={task.id || idx} className="relative flex h-8 w-full items-center rounded bg-slate-100/70">
              
              {/* The Blue Timeline Bar */}
              <div
                className="absolute flex h-6 items-center justify-between rounded bg-blue-600 px-2.5 text-[10px] font-bold text-white shadow-sm transition-all"
                style={{
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                  // max-content ensures the bar always fits the text even if width is 0.5%
                  minWidth: 'max-content',
                  // Optional: prevents it from overflowing the right side of the screen if left is 99%
                  maxWidth: `calc(100% - ${startPercent}%)` 
                }}
                title={`Starts: Day ${task.startDay} | Ends: Day ${task.endDay}`}
              >
                {/* Task Title inside the bar */}
                <span className="truncate pr-3">
                {task.title || task.taskName}
                </span>

                {/* Right side data inside the bar */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <span>Day {task.endDay}</span>
                  {(task.requiredDocs?.length > 0 || task.requiredDocumentNames?.length > 0) && (
                    <span className="rounded bg-black/25 px-1 py-0.5 text-[9px] leading-none">
                      📄{(task.requiredDocs || task.requiredDocumentNames).length}
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