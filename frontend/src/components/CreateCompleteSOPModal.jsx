import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import UserPickerModal from './UserPickerModal';
import { getUsersByPermission } from '../services/api';

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

const createCompleteSopSchema = z.object({
  sopCode: z.string().trim().min(1, 'SOP Code is required.'),
  title: z.string().trim().min(1, 'SOP Title is required.'),
  description: z.string().optional(),
  processCategory: z.string().min(1, 'Process Category is required.'),
  entityCode: z.string().min(1, 'Corporate Entity is required.'),
  sopStartDate: z.string().min(1, 'SOP Start Date is required.'),
  sopEndDate: z.string().min(1, 'SOP End Date is required.'),
  frequency: z.string().default('MONTHLY'),
  dueDayOffset: z.coerce
    .number()
    .min(0, 'Offset must be at least 0')
    .max(31, 'Offset cannot exceed 31'),
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

// function UserPickerModal({
//   isOpen,
//   title,
//   targetRole,
//   selectedUserIds = [],
//   permittedUsers = [],
//   onClose,
//   onConfirm,
// }) {
//   const [selected, setSelected] = useState(selectedUserIds);

//   useEffect(() => {
//     setSelected(selectedUserIds);
//   }, [selectedUserIds, isOpen]);

//   if (!isOpen) return null;

//   const toggleUser = (id) => {
//     setSelected((prev) =>
//       prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
//     );
//   };

//   return (
//     <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
//       <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
//         <div className="flex items-center justify-between border-b border-slate-100 pb-3">
//           <h3 className="text-sm font-bold text-slate-800">{title}</h3>
//           <button
//             type="button"
//             onClick={onClose}
//             className="text-slate-400 hover:text-slate-600 font-bold"
//           >
//             ✕
//           </button>
//         </div>

//         <div className="my-4 max-h-60 space-y-1.5 overflow-y-auto pr-1">
//           {permittedUsers.length === 0 ? (
//             <p className="py-4 text-center text-xs text-slate-400">
//               No permitted {targetRole.toLowerCase()}s found for this category.
//             </p>
//           ) : (
//             permittedUsers.map((user) => {
//               const uId = user.id || user.userId || user;
//               const uName = user.name || user.fullName || user.email || uId;
//               const isChecked = selected.includes(uId);

//               return (
//                 <label
//                   key={uId}
//                   className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-100 p-2.5 transition hover:bg-slate-50"
//                 >
//                   <span className="text-xs font-medium text-slate-700">{uName}</span>
//                   <input
//                     type="checkbox"
//                     checked={isChecked}
//                     onChange={() => toggleUser(uId)}
//                     className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
//                   />
//                 </label>
//               );
//             })
//           )}
//         </div>

//         <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
//           <button
//             type="button"
//             onClick={onClose}
//             className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
//           >
//             Cancel
//           </button>
//           <button
//             type="button"
//             onClick={() => onConfirm(selected)}
//             className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
//           >
//             Confirm Selection ({selected.length})
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

export default function SopDrawer({
  isOpen = true,
  currentUser = { id: 'usr-1', name: 'Compliance Lead', role: 'ADMIN' },
  // userMap = {
  //   'usr-1': 'Compliance Lead (Admin)',
  //   'usr-2': 'Aarav Sharma (Senior Maker)',
  //   'usr-3': 'Priya Patel (Auditor / Checker)',
  //   'usr-4': 'Vikram Singh (Tax Specialist)',
  // },
  userMap,
  creatableCategories = [],
  onClose = () => { },
  onSuccess = () => { },
}) {
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'workflow' | 'gantt'
  const [processOptions, setProcessOptions] = useState([
    { value: 'TAX_AUDIT', label: 'Statutory Tax Audit' },
    { value: 'GST_FILING', label: 'GST Monthly & Annual Compliance' },
    { value: 'VENDOR_RECON', label: 'Vendor Ledger Reconciliation' },
    { value: 'PAYROLL_OPS', label: 'Monthly Corporate Payroll' },
    { value: 'kk', label: 'KKN' }
  ]);
  const [errorMsg, setErrorMsg] = useState('');

  // Modals for execution pools
  const [showMakerPicker, setShowMakerPicker] = useState(false);
  const [showCheckerPicker, setShowCheckerPicker] = useState(false);

  // Available users per permission
  const [permittedMakers, setPermittedMakers] = useState([
    { id: 'usr-1', name: 'Compliance Lead' },
    { id: 'usr-2', name: 'Aarav Sharma' },
    { id: 'usr-4', name: 'Vikram Singh' },
  ]);
  const [permittedCheckers, setPermittedCheckers] = useState([
    { id: 'usr-1', name: 'Compliance Lead' },
    { id: 'usr-3', name: 'Priya Patel' },
  ]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [globalDocs, setGlobalDocs] = useState([
    'GST Return Draft (GSTR-3B)',
    'Audited Balance Sheet',
    'Vendor Invoices Summary',
    'Bank Reconciliation Statement',
    'Challan Tax Payment Receipts',
  ]);

  const [taskLevelDocs,setTaskLevelDocs] = useState([
    'GST Return Draft (GSTR-3B)',
    'Audited Balance Sheet',
    'Vendor Invoices Summary',
    'Bank Reconciliation Statement',
    'Challan Tax Payment Receipts',

  ])
  const [newDocName, setNewDocName] = useState('');
  const [newTaskDocName,setNewTaskDocName] = useState('')

  const [tasks, setTasks] = useState([
    {
      id: 'task-1',
      title: 'Initial Document Collection & Preliminary Audit',
      startDate: '2026-10-01',
      endDate: '2026-10-10',
      requiredDocs: ['GST Return Draft (GSTR-3B)', 'Vendor Invoices Summary'],
      dependencyMode: 'INDEPENDENT', // 'INDEPENDENT' | 'DEPENDENT_ON_PREVIOUS'
      priority: 'High',
    },
    {
      id: 'task-2',
      title: 'Ledger Reconciliation & Discrepancy Checks',
      startDate: '2026-10-11',
      endDate: '2026-10-20',
      requiredDocs: ['Bank Reconciliation Statement'],
      dependencyMode: 'DEPENDENT_ON_PREVIOUS',
      priority: 'Medium',
    },
  ]);

  const [taskTitle, setTaskTitle] = useState('');
  const [taskStartDate, setTaskStartDate] = useState('');
  const [taskEndDate, setTaskEndDate] = useState('');
  const [taskDocs, setTaskDocs] = useState([]);
  const [taskDependencyMode, setTaskDependencyMode] = useState('INDEPENDENT');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskMakers, setTaskMakers] = useState([]);
  const [taskCheckers, setTaskCheckers] = useState([]);
  const [showTaskMakerPicker, setShowTaskMakerPicker] = useState(false);
  const [showTaskCheckerPicker, setShowTaskCheckerPicker] = useState(false);
  const [taskError, setTaskError] = useState('');

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
      sopCode: 'SOP-TAX-2026-001',
      title: 'Annual Statutory GST Audit & Compliance Filing',
      description: 'Comprehensive operational procedure for regulatory submissions.',
      processCategory: 'GST_FILING',
      entityCode: 'CK_INDIA',
      sopStartDate: '',
      sopEndDate: '',
      frequency: 'MONTHLY',
      dueDayOffset: 0,
      isRecurring: false,
      defaultMakerIds: ['usr-2'],
      defaultCheckerIds: ['usr-3'],
    },
  });

  const processCategory = useWatch({ control, name: 'processCategory' });
  const entityCode = useWatch({ control, name: 'entityCode' });
  const isRecurring = useWatch({ control, name: 'isRecurring' });
  const sopEndDate = useWatch({ control, name: 'sopEndDate' });
  const defaultMakerIds = useWatch({ control, name: 'defaultMakerIds' }) || [];
  const defaultCheckerIds = useWatch({ control, name: 'defaultCheckerIds' }) || [];

  const assignedDocsMap = useMemo(() => {
    const map = new Map();
    tasks.forEach((task, index) => {
      task.requiredDocs.forEach((doc) => {
        map.set(doc, {
          taskId: task.id,
          stepNumber: index + 1,
          taskTitle: task.title,
        });
      });
    });
    return map;
  }, [tasks]);

  const handleAddGlobalDoc = () => {
    const trimmed = newDocName.trim();
    if (!trimmed) return;
    if (globalDocs.includes(trimmed)) {
      setErrorMsg('This document name is already in the global checklist.');
      return;
    }
    setGlobalDocs([...globalDocs, trimmed]);
    setNewDocName('');
    setErrorMsg('');
  };

  const handleRemoveGlobalDoc = (docToRemove) => {
    setGlobalDocs(globalDocs.filter((d) => d !== docToRemove));
    // Remove document from any tasks referencing it
    setTasks(
      tasks.map((t) => ({
        ...t,
        requiredDocs: t.requiredDocs.filter((d) => d !== docToRemove),
      }))
    );
    setTaskDocs(taskDocs.filter((d) => d !== docToRemove));
  };

  const handleAddTaskDoc = () => {
    const trimmed = newDocName.trim();
    if (!trimmed) return;
    if (taskLevelDocs.includes(trimmed)) {
      setErrorMsg('This document name is already in the global checklist.');
      return;
    }
    setTaskLevelDocs([...taskLevelDocs, trimmed]);
    setNewDocName('');
    setErrorMsg('');
  };

  const handleRemoveTaskDoc = (docToRemove) => {
    setTaskLevelDocs(taskLevelDocs.filter((d) => d !== docToRemove));
    // Remove document from any tasks referencing it
    setTasks(
      tasks.map((t) => ({
        ...t,
        requiredDocs: t.requiredDocs.filter((d) => d !== docToRemove),
      }))
    );
    setTaskDocs(taskDocs.filter((d) => d !== docToRemove));
  };

  const toggleTaskDocSelection = (docName) => {
    if (taskDocs.includes(docName)) {
      setTaskDocs(taskDocs.filter((d) => d !== docName));
    } else {
      setTaskDocs([...taskDocs, docName]);
    }
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    setTaskError('');

    if (!taskTitle.trim()) {
      setTaskError('Please enter a valid Task Name.');
      return;
    }
    if (!taskStartDate || !taskEndDate) {
      setTaskError('Both Start Date and End Date are mandatory.');
      return;
    }

    const taskStart = new Date(taskStartDate);
    const taskEnd = new Date(taskEndDate);

    if (taskEnd < taskStart) {
      setTaskError('Task End Date cannot be earlier than Task Start Date.');
      return;
    }

    if (sopEndDate && taskEnd > new Date(sopEndDate)) {
      setTaskError(
        `Task End Date (${taskEndDate}) cannot exceed overall SOP End Date (${sopEndDate}).`
      );
      return;
    }

    const newTask = {
      id: `task-${Date.now()}`,
      title: taskTitle.trim(),
      startDate: taskStartDate,
      endDate: taskEndDate,
      requiredDocs: [...taskDocs],
      dependencyMode: tasks.length === 0 ? 'INDEPENDENT' : taskDependencyMode,
      priority: taskPriority,
    };

    setTasks([...tasks, newTask]);

    // Reset local task form state
    setTaskTitle('');
    setTaskStartDate('');
    setTaskEndDate('');
    setTaskDocs([]);
    setTaskDependencyMode('DEPENDENT_ON_PREVIOUS');
    setTaskPriority('Medium');
  };

  const handleDeleteTask = (taskId) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
  };

  const onSubmit = async (data) => {
    setErrorMsg('');
    try {
      const payload = {
        ...data,
        tasks,
        globalDocs,
        createdById: currentUser?.id || '',
      };

      if (onSuccess) {
        onSuccess(`SOP "${data.title}" saved and activated successfully!`);
      }
      reset();
      onClose();
    } catch (err) {
      setErrorMsg(err?.message || 'An error occurred while creating the SOP.');
    }
  };

  if (!isOpen) return null;

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

        // Reset pool selections gracefully after fetching
        setValue('defaultMakerIds', []);
        setValue('defaultCheckerIds', []);
      } catch {
        setPermittedMakers([]);
        setPermittedCheckers([]);
      } finally {
        setLoadingUsers(false);
      }
    },
    [setValue]
  );

  const scales = [
    { unit: "month", step: 1, format: "%F %Y" },
    { unit: "day", step: 1, format: "%j" },
  ];


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


  return (
    <div className="fixed inset-0 z-[1100] flex justify-end bg-slate-900/60 backdrop-blur-sm transition-opacity">
      {/* Backdrop click closer */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Panel Container */}
      <div className="relative flex h-full w-full max-w-[1200px] flex-col bg-slate-50 shadow-2xl transition-transform">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-blue-800 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 px-6 py-4 text-white shadow-md">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold tracking-tight text-white">
                Create SOP Workflow Template
              </h2>
              <span className="rounded-full border border-blue-200/40 bg-blue-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-blue-100">
                Expanded Drawer View
              </span>
            </div>
            <p className="mt-0.5 text-xs text-blue-100/90">
              Define SOP parameters, global document checklist, sequential task workflow, and visual timeline.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/25"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'details'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            1. SOP Meta & Document Checklist
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('workflow')}
            className={`border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'workflow'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            2. Linear Task Workflow ({tasks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gantt')}
            className={`border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'gantt'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            3. Gantt Timeline Overview
          </button>
        </div>


        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {errorMsg && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
                {errorMsg}
              </div>
            )}

            {/* TAB 1: SOP METADATA & DOCUMENT CHECKLIST */}
            {activeTab === 'details' && (
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-7 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    SOP Core Information
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                        Process Category *
                      </label>
                      <select
                        {...register('processCategory')}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
                      >
                        <option value="">-- Select Category --</option>
                        {processOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {errors.processCategory && (
                        <p className="mt-1 text-[11px] text-red-500">
                          {errors.processCategory.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                        Corporate Entity *
                      </label>
                      <select
                        {...register('entityCode')}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
                      >
                        {ENTITY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-blue-700 mb-1">
                        SOP Start Date *
                      </label>
                      <input
                        type="date"
                        {...register('sopStartDate')}
                        className="w-full rounded-lg border border-blue-400 bg-blue-50/30 p-2.5 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                      />
                      {errors.sopStartDate && (
                        <p className="mt-1 text-[11px] text-red-500">{errors.sopStartDate.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-blue-700 mb-1">
                        SOP End Date *
                      </label>
                      <input
                        type="date"
                        {...register('sopEndDate')}
                        className="w-full rounded-lg border border-blue-400 bg-blue-50/30 p-2.5 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                      />
                      {errors.sopEndDate && (
                        <p className="mt-1 text-[11px] text-red-500">{errors.sopEndDate.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                      SOP Title / Name *
                    </label>
                    <input
                      type="text"
                      {...register('title')}
                      className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
                    />
                    {errors.title && (
                      <p className="mt-1 text-[11px] text-red-500">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      {...register('description')}
                      placeholder="Outline operational guidelines and criteria..."
                      className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                        Recurrence
                      </label>
                      <button
                        type="button"
                        onClick={() => setValue('isRecurring', !isRecurring)}
                        className={`w-full rounded-lg p-2 text-xs font-bold transition ${isRecurring ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                      >
                        {isRecurring ? 'Recurring' : 'One-Time'}
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                        Frequency
                      </label>
                      <Controller
                        name="frequency"
                        control={control}
                        render={({ field }) => (
                          <CustomSelect
                            name={field.name}
                            value={field.value}
                            disabled={!isRecurring}
                            options={FREQ_OPTIONS}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        )}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                        Due Day Offset
                      </label>
                      <input
                        type="number"
                        {...register('dueDayOffset')}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Global Documents & Pools */}
                <div className="col-span-5 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">



                  {/* <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Global Required Document Checklist
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                      Names of required documents makers must provide throughout this SOP. Assigned
                      documents cannot be reused across tasks.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Form 16B, Tax Clearance"
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGlobalDoc())}
                      className="flex-1 rounded-lg border border-slate-300 p-2 text-xs font-medium focus:border-blue-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddGlobalDoc}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      + Add
                    </button>
                  </div>

                  <div className="max-h-[160px] min-h-[120px] space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    {globalDocs.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No documents added yet.
                      </div>
                    ) : (
                      globalDocs.map((doc, idx) => {
                        const assignment = assignedDocsMap.get(doc);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-700">{doc}</span>
                              {assignment && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                                  Step {assignment.stepNumber}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveGlobalDoc(doc)}
                              className="font-bold text-slate-400 hover:text-red-500"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div> */}

                  {/* Execution Pools */}
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase text-slate-600">
                        Assigned Maker Pool *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowMakerPicker(true)}
                        className="rounded bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                      >
                        Select ({defaultMakerIds.length})
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {defaultMakerIds.map((id) => (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                        >
                          {userMap[id] || id}
                          <button
                            type="button"
                            onClick={() => removeMaker(id)}
                            className="font-bold text-slate-400 hover:text-red-500"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="text-xs font-semibold uppercase text-slate-600">
                        Assigned Checker Pool *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCheckerPicker(true)}
                        className="rounded bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                      >
                        Select ({defaultCheckerIds.length})
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {defaultCheckerIds.map((id) => (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                        >
                          {userMap[id] || id}
                          <button
                            type="button"
                            onClick={() => removeChecker(id)}
                            className="font-bold text-slate-400 hover:text-red-500"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'workflow' && (
              <div className="grid grid-cols-12 gap-6">
                {/* Left Side: Linear Task Creator Form */}
                <div className="col-span-5 space-y-3.5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Append Task Step ({tasks.length + 1})
                    </h3>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      Linear Chain
                    </span>
                  </div>

                  {taskError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs font-semibold text-red-600">
                      {taskError}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                        Task Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Verify Purchase Ledger"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                          Start Date *
                        </label>
                        <input
                          type="date"
                          value={taskStartDate}
                          onChange={(e) => setTaskStartDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-blue-700 mb-1">
                          End Date *
                        </label>
                        <input
                          type="date"
                          value={taskEndDate}
                          onChange={(e) => setTaskEndDate(e.target.value)}
                          className="w-full rounded-lg border border-blue-300 bg-blue-50/20 p-2 text-xs font-medium focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Requirement 3: Only 2 dependency options: Independent or Dependent on Previous */}
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                        Task Dependency
                      </label>
                      <select
                        value={taskDependencyMode}
                        onChange={(e) => setTaskDependencyMode(e.target.value)}
                        disabled={tasks.length === 0}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                      >
                        <option value="INDEPENDENT">Independent Task</option>
                        {tasks.length > 0 && (
                          <option value="DEPENDENT_ON_PREVIOUS">
                            Dependent on Previous Task (Step {tasks.length}: {tasks[tasks.length - 1].title})
                          </option>
                        )}
                      </select>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {tasks.length === 0
                          ? 'The first task step is inherently independent.'
                          : 'Dependent tasks wait for previous task signoff before triggering.'}
                      </p>
                    </div>

                    {/* Requirement 4: Required Documents with Exclusivity Rule */}
                    {/* <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold uppercase text-slate-600">
                          Select Required Documents ({taskDocs.length})
                        </label>
                        <span className="text-[10px] text-slate-400">Exclusive Assignment</span>
                      </div>
                      <div className="max-h-[130px] space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                        {globalDocs.length === 0 ? (
                          <p className="text-[11px] text-slate-400">
                            Configure documents in Tab 1 first.
                          </p>
                        ) : (
                          globalDocs.map((doc) => {
                            const assignedInfo = assignedDocsMap.get(doc);
                            const isAssignedElsewhere = !!assignedInfo;

                            return (
                              <label
                                key={doc}
                                className={`flex items-center justify-between rounded p-1 text-xs font-medium ${isAssignedElsewhere
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'text-slate-700 hover:bg-white cursor-pointer'
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    disabled={isAssignedElsewhere}
                                    checked={taskDocs.includes(doc)}
                                    onChange={() => toggleTaskDocSelection(doc)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                                  />
                                  <span className={isAssignedElsewhere ? 'line-through text-slate-400' : ''}>
                                    {doc}
                                  </span>
                                </div>
                                {isAssignedElsewhere && (
                                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                                    Step {assignedInfo.stepNumber} Assigned
                                  </span>
                                )}
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div> */}
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Required Document Checklist
                      </h3>
                      <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                        Names of required documents makers must provide at this task.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Form 16B, Tax Clearance"
                        value={newDocName}
                        onChange={(e) => setNewDocName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGlobalDoc())}
                        className="flex-1 rounded-lg border border-slate-300 p-2 text-xs font-medium focus:border-blue-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddGlobalDoc}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        + Add
                      </button>
                    </div>

                    <div className="max-h-[160px] min-h-[120px] space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                      {taskLevelDocs.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          No documents added yet.
                        </div>
                      ) : (
                        taskLevelDocs.map((doc, idx) => {
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-700">{doc}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveGlobalDoc(doc)}
                                className="font-bold text-slate-400 hover:text-red-500"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                          Priority
                        </label>
                        <select
                          value={taskPriority}
                          onChange={(e) => setTaskPriority(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                      <div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase text-slate-600">
                          Makers for this task *
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowTaskMakerPicker(true)}
                          className="rounded bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                        >
                          Select ({taskMakers.length})
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {taskMakers.map((id) => (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                          >
                            {userMap[id] || id}
                            <button
                              type="button"
                              onClick={() => removeMaker(id)}
                              className="font-bold text-slate-400 hover:text-red-500"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="text-xs font-semibold uppercase text-slate-600">
                          Checkers for this task *
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowTaskCheckerPicker(true)}
                          className="rounded bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                        >
                          Select ({taskCheckers.length})
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {taskCheckers.map((id) => (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                          >
                            {userMap[id] || id}
                            <button
                              type="button"
                              onClick={() => removeChecker(id)}
                              className="font-bold text-slate-400 hover:text-red-500"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddTask}
                      className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white shadow hover:bg-blue-700 transition"
                    >
                      + Append Task to the workflow
                    </button>
                  </div>
                </div>

                <div className="col-span-7 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Execution Chain Flow
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Target Deadline: <strong className="text-blue-600">{sopEndDate || 'Not Set'}</strong>
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                      {tasks.length} Steps
                    </span>
                  </div>

                  <div className="min-h-[420px] max-h-[500px] space-y-3 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-4">
                    {tasks.length === 0 ? (
                      <div>
                      <div className="py-16 text-center text-xs text-slate-400">
                        No tasks configured. Add task steps sequentially from the left panel.
                      </div>
                      <button onClick={()=>console.log("Clicked")}>
                          Create Task
                        </button>
                      </div>
                    ) : (
                      tasks.map((task, idx) => {
                        const prevTask = idx > 0 ? tasks[idx - 1] : null;
                        const isDependent =
                          task.dependencyMode === 'DEPENDENT_ON_PREVIOUS' && prevTask;

                        return (
                          <div key={task.id} className="relative">
                            {idx > 0 && (
                              <div className="flex items-center justify-center my-2">
                                <span className="rounded-full bg-slate-200 px-3 py-0.5 text-[10px] font-bold text-slate-600 shadow-sm">
                                  ↓ {isDependent ? `Depends on Step ${idx}` : 'Runs Independently'}
                                </span>
                              </div>
                            )}

                            <div className="flex items-start justify-between rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                                    STEP {idx + 1}
                                  </span>
                                  <h4 className="text-xs font-bold text-slate-800">{task.title}</h4>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${task.priority === 'High'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-slate-100 text-slate-600'
                                      }`}
                                  >
                                    {task.priority}
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                                  <span>{task.startDate} → {task.endDate}</span>
                                  {isDependent ? (
                                    <span className="font-semibold text-amber-700">
                                      Linked to Step {idx}
                                    </span>
                                  ) : (
                                    <span className="font-semibold text-emerald-700">
                                      Independent
                                    </span>
                                  )}
                                </div>

                                {task.requiredDocs.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {task.requiredDocs.map((d) => (
                                      <span
                                        key={d}
                                        className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700"
                                      >
                                        {d}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-xs font-bold text-slate-400 hover:text-red-500"
                              >
                                ✕
                              </button>
                            </div>

                            {idx === (tasks.length -1) && (<div>
                              <button onClick={()=>console.log("Clicked")}>Create Task</button>

                            </div>) }
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'gantt') && (
              <div
                className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 ${activeTab === 'workflow' ? 'mt-6' : ''
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Sequential Gantt Timeline
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Visual execution schedule mapping task durations, sequencing, and the SOP deadline marker.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                      <span className="inline-block h-3 w-3 rounded bg-blue-600" /> Tasks
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
                      <span className="inline-block h-3 w-0.5 bg-red-500" /> SOP End Date
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <GanttTimelineChart tasks={tasks} />
                  {/* <Willow>
                    <Gantt tasks={tasks} scales={scales} />
                  </Willow> */}

                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4 shadow-inner">
            <div className="text-xs text-slate-500">
              Total Steps: <strong className="text-slate-800">{tasks.length}</strong> | Required Checklist Docs:{' '}
              <strong className="text-slate-800">{globalDocs.length}</strong>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !processCategory || loadingUsers}
                className="rounded-lg bg-blue-600 px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Activating SOP...' : 'Create & Activate SOP'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {showMakerPicker && <UserPickerModal
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
      />}



      {showCheckerPicker && <UserPickerModal
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
      />}



      {showTaskMakerPicker && <UserPickerModal
        isOpen={showTaskMakerPicker}
        title="Select Task Maker Pool"
        entityCode={entityCode}
        targetRole="MAKER"
        selectedUserIds={taskMakers}
        permittedUsers={defaultMakerIds}
        onClose={() => setShowTaskMakerPicker(false)}
        onConfirm={(selectedIds) => {
          setTaskMakers([...selectedIds]);
          setShowTaskMakerPicker(false);
        }}
      />}



      {showTaskCheckerPicker && <UserPickerModal
        isOpen={showTaskCheckerPicker}
        title="Select Task Checker Pool"
        entityCode={entityCode}
        targetRole="CHECKER"
        selectedUserIds={taskCheckers}
        permittedUsers={defaultCheckerIds}
        onClose={() => setShowTaskCheckerPicker(false)}
        onConfirm={(selectedIds) => {
          setTaskCheckers([...selectedIds]);
          setShowTaskCheckerPicker(false);
        }}
      />}


    </div>
  );
}

function GanttTimelineChart({ tasks = [], sopEndDate = '' }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No task timeline data available. Please append task steps above.
      </div>
    );
  }

  const validDates = [];
  tasks.forEach((t) => {
    if (t.startDate) validDates.push(new Date(t.startDate).getTime());
    if (t.endDate) validDates.push(new Date(t.endDate).getTime());
  });
  if (sopEndDate) validDates.push(new Date(sopEndDate).getTime());

  if (validDates.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        Set valid dates to render the timeline.
      </div>
    );
  }

  const minTime = Math.min(...validDates);
  const maxTime = Math.max(...validDates);
  const totalDuration = Math.max(1, maxTime - minTime);

  const getPositionPercent = (dateStr) => {
    if (!dateStr) return 0;
    const time = new Date(dateStr).getTime();
    return Math.max(0, Math.min(100, ((time - minTime) / totalDuration) * 100));
  };

  const sopEndPercent = sopEndDate ? getPositionPercent(sopEndDate) : null;

  return (
    <div className="min-w-[650px] space-y-3 font-sans">
      <div className="grid grid-cols-12 border-b border-slate-200 pb-2 text-[10px] font-bold uppercase text-slate-400">
        <div className="col-span-4">Task Step</div>
        <div className="col-span-8 relative flex justify-between px-2">
          <span>{new Date(minTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          <span>Timeline View</span>
          <span>{new Date(maxTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      <div className="relative space-y-2.5">
        {sopEndPercent !== null && (
          <div
            className="absolute top-0 bottom-0 z-10 w-0.5 bg-red-500 border-r border-dashed border-red-400"
            style={{ left: `calc(33.33% + ${(sopEndPercent * 66.67) / 100}%)` }}
          >
            <span className="absolute -top-3.5 -translate-x-1/2 rounded bg-red-600 px-1 py-0.5 text-[8px] font-bold text-white shadow">
              SOP END
            </span>
          </div>
        )}

        {tasks.map((task, idx) => {
          const startPercent = getPositionPercent(task.startDate);
          const endPercent = getPositionPercent(task.endDate);
          const widthPercent = Math.max(4, endPercent - startPercent);

          return (
            <div key={task.id} className="grid grid-cols-12 items-center text-xs">
              <div className="col-span-4 truncate pr-2 font-medium text-slate-700 flex items-center gap-1.5">
                <span className="font-bold text-blue-600">{idx + 1}.</span>
                <span className="truncate" title={task.title}>
                  {task.title}
                </span>
              </div>

              <div className="col-span-8 relative h-7 rounded bg-slate-100/70 flex items-center px-1">
                <div
                  className="absolute h-5 rounded px-2 text-[10px] font-bold text-white flex items-center justify-between shadow-sm bg-blue-600 transition-all"
                  style={{
                    left: `${startPercent}%`,
                    width: `${Math.min(widthPercent, 100 - startPercent)}%`,
                    minWidth: '42px',
                  }}
                >
                  <span className="truncate">{task.title}</span>
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