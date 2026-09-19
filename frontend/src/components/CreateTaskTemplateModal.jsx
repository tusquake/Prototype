import { useState, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
// import UserPickerModal from "./UserPickerModal"; // Assuming this is used elsewhere


const getMaxDays = (freq) => {
  switch (freq?.toUpperCase()) {
    case 'WEEKLY': return 7;
    case 'MONTHLY': return 31;
    case 'QUARTERLY': return 90;
    case 'ANNUAL': return 365;
    default: return 30; // Default fallback
  }
};

export default function CreateTaskTemplateModal({
  isOpen,
  onClose,
  onSaveTask,
  existingTasksCount,
  userMap,
  parentMakerPool,
  parentCheckerPool,
  frequency,
  dueDayOffset,
  editingTask = null,
  isViewOnly = false,
}) {
  const [catTitle, setCatTitle] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [editingCatIndex, setEditingCatIndex] = useState(null);

  const maxDeadline = getMaxDays(frequency);

  const calculatedMaxDeadline = Math.min(dueDayOffset, maxDeadline)

  const taskSchema = useMemo(() => {
    return z.object({
      taskTitle: z.string().trim().min(1, 'Task Name is required.'),
      taskDependencyMode: z.string(),
      taskEndDate: z.coerce.number().min(1, 'Completion Deadline must be at least 1.').max(calculatedMaxDeadline, `Completion Deadline cannot exceed ${calculatedMaxDeadline} days.`),
      requiredDocuments: z.array(
        z.object({
          name: z.string().min(1, "Document Name is required"),
          description: z.string().optional(),
        })
      ).optional(),
      taskMakers: z.array(z.string()).min(1, 'Please select at least one Maker for this task.'),
      taskCheckers: z.array(z.string()).min(1, 'Please select at least one Checker for this task.'),
    })
  }, [calculatedMaxDeadline])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    setError,
    clearErrors,
    control,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      taskTitle: '',
      taskDependencyMode: 'INDEPENDENT',
      taskEndDate: Math.min(dueDayOffset, maxDeadline),
      taskMakers: [],
      taskCheckers: [],
      requiredDocuments: [],
    }
  });

  const taskTitle = useWatch({ control, name: 'taskTitle' })
  const taskEndDate = useWatch({ control, name: 'taskEndDate' })
  const taskMakers = useWatch({ control, name: 'taskMakers' })
  const taskCheckers = useWatch({ control, name: 'taskCheckers' })
  const requiredDocuments = useWatch({ control, name: 'requiredDocuments' })

  const handleAddOrUpdateCategory = () => {
    if (!catTitle.trim()) return;

    const newDoc = {
      name: catTitle.trim(),
      description: catDesc.trim(),
    };

    let updatedList;
    const currentList = requiredDocuments || [];
    if (editingCatIndex !== null) {
      updatedList = [...currentList];
      updatedList[editingCatIndex] = newDoc;
      setEditingCatIndex(null);
    } else {
      updatedList = [...currentList, newDoc];
    }
    setValue('requiredDocuments', updatedList, { shouldValidate: true, shouldDirty: true });
    clearErrors('requiredDocuments');

    setCatTitle('');
    setCatDesc('');
  };

  const handleEditCategory = (index) => {
    const doc = requiredDocuments[index];
    if (!doc) return;
    setCatTitle(doc.name || doc.title || '');
    setCatDesc(doc.description || '');
    setEditingCatIndex(index);
  };

  const handleRemoveCategory = (index) => {
    const currentList = requiredDocuments || [];
    const updatedList = currentList.filter((_, i) => i !== index);
    setValue('requiredDocuments', updatedList, { shouldValidate: true, shouldDirty: true });
    if (editingCatIndex === index) {
      setEditingCatIndex(null);
      setCatTitle('');
      setCatDesc('');
    }
  };

  function normalizeDocs(rawDocs) {
    if (!Array.isArray(rawDocs)) return [];
    return rawDocs.map(item => {
      if (typeof item === 'string') {
        return { name: item, description: '' };
      }
      return {
        name: item.name || item.title || item.documentName || '',
        description: item.description || item.desc || item.documentDescription || ''
      };
    }).filter(d => d.name.trim() !== '');
  }

  useEffect(() => {
    if (isOpen) {
      setCatTitle('');
      setCatDesc('');
      setEditingCatIndex(null);
      if (editingTask) {
        const rawDocs = editingTask.requiredDocuments || [];
        reset({
          taskTitle: editingTask?.title || editingTask?.taskName || '',
          taskDependencyMode: editingTask?.dependencyMode || 'INDEPENDENT',
          taskEndDate: editingTask?.etaEndDay !== undefined ? editingTask.etaEndDay : 31,
          taskMakers: editingTask?.makers || editingTask?.makerIds || [],
          taskCheckers: editingTask?.checkers || editingTask?.checkerIds || [],
          requiredDocuments: normalizeDocs(rawDocs),
        });
      } else {
        reset({
          taskTitle: '',
          taskDependencyMode: existingTasksCount === 0 ? 'INDEPENDENT' : 'DEPENDENT_ON_PREVIOUS',
          taskEndDate: Math.min(dueDayOffset, maxDeadline),
          taskMakers: [...parentMakerPool],
          taskCheckers: [...parentCheckerPool],
          requiredDocuments: [],
        });
      }
    }
  }, [isOpen, editingTask, existingTasksCount, parentMakerPool, parentCheckerPool, reset, dueDayOffset, maxDeadline]);

  if (!isOpen) return null;

  const removeMaker = (id) => {
    if (isViewOnly) return;
    setValue('taskMakers', taskMakers.filter((x) => x !== id), { shouldValidate: true });
  };

  const removeChecker = (id) => {
    if (isViewOnly) return;
    setValue('taskCheckers', taskCheckers.filter((x) => x !== id), { shouldValidate: true });
  };

  const onSubmit = (data) => {
    if (isViewOnly) {
      onClose();
      return;
    }

    const docs = data.requiredDocuments || [];

    const newTaskTemplate = {
      id: editingTask ? editingTask.id : `task-template-${Date.now()}`,
      taskTemplateId: editingTask ? editingTask.taskTemplateId : null,
      stepSequence: editingTask ? editingTask.stepSequence : existingTasksCount + 1,
      title: data.taskTitle,
      dependencyMode: data.taskDependencyMode,
      etaStartDay: 0,
      etaEndDay: data.taskEndDate,
      requiredDocuments: docs,
      makers: data.taskMakers,
      checkers: data.taskCheckers,
      savedToBackend: !!editingTask?.taskTemplateId,
    };

    onSaveTask(newTaskTemplate, !!editingTask);
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              {isViewOnly ? `View Step ${editingTask?.stepSequence || 1} Task Details` : editingTask ? `Edit Step ${editingTask.stepSequence} Task Template` : `Create Step ${existingTasksCount + 1} Task Template`}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Define task template details for this execution step.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            <div className="grid grid-cols-12 gap-8">

              {/* LEFT COLUMN: Metadata & Pools (col-span-4) */}
              <div className="col-span-12 md:col-span-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Task Template Name *</label>
                    <input
                      type="text"
                      disabled={isViewOnly}
                      {...register('taskTitle', { onChange: () => clearErrors('taskTitle') })}
                      placeholder="e.g. Verify Ledger Entries"
                      className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
                    />
                    {errors.taskTitle && (
                      <p className="mt-1 text-[10px] text-red-500">{errors.taskTitle.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Step Dependency</label>
                    <select
                      disabled={existingTasksCount === 0 || isViewOnly}
                      {...register('taskDependencyMode')}
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                    >
                      <option value="INDEPENDENT">Independent Task</option>
                      {existingTasksCount > 0 && <option value="DEPENDENT_ON_PREVIOUS">Dependent on Task {editingTask && editingTask.
                        stepSequence ? editingTask.
                          stepSequence - 1 : existingTasksCount}</option>}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">Completion Deadline (ETA) *</h4>

                  <div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={Math.min(dueDayOffset, maxDeadline)}
                        disabled={isViewOnly}
                        {...register('taskEndDate', { valueAsNumber: true, onChange: () => clearErrors('taskEndDate') })}
                        className="w-full rounded-lg border border-blue-300 bg-white p-2 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                      />
                      <span className="text-xs font-semibold text-blue-700">{taskEndDate == 1 ? 'Day' : 'Days'}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">By {taskEndDate} {taskEndDate == 1 ? 'Day' : 'Days'} of SOP period</span>
                    {errors.taskEndDate && (
                      <p className="mt-1 text-[10px] text-red-500">{errors.taskEndDate.message}</p>
                    )}
                  </div>

                </div>

                {/* Required Task Documents Section */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                    Required Task Documents
                  </h4>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Specify evidence files or working papers required from the Maker for task completion.
                  </p>

                  {/* Input Row */}
                  <div className="flex gap-2 mb-4 items-start">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <input
                        type="text"
                        disabled={isViewOnly}
                        placeholder="Document Name (e.g., Form 16B) *"
                        value={catTitle}
                        onChange={(e) => setCatTitle(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                      />
                    </div>
                    <div className="flex-[1.5] flex flex-col gap-1.5">
                      <input
                        type="text"
                        disabled={isViewOnly}
                        placeholder="Description (Optional)"
                        value={catDesc}
                        onChange={(e) => setCatDesc(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOrUpdateCategory())}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isViewOnly || !catTitle.trim()}
                      onClick={handleAddOrUpdateCategory}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed shrink-0"
                    >
                      {editingCatIndex !== null ? 'Update' : '+ Add'}
                    </button>
                    {editingCatIndex !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatIndex(null);
                          setCatTitle('');
                          setCatDesc('');
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 shrink-0"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {errors.requiredDocuments && (
                    <p className="text-[10px] text-red-500 mb-2">{errors.requiredDocuments.message}</p>
                  )}

                  {/* Table View */}
                  {requiredDocuments?.length === 0 ? (
                    <span className="text-[11px] italic text-slate-400">No required documents added for this step.</span>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/50 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2 font-semibold text-slate-600 w-1/3">Document Name</th>
                            <th className="px-3 py-2 font-semibold text-slate-600">Description</th>
                            {!isViewOnly && <th className="px-3 py-2 font-semibold text-slate-600 w-[80px] text-right">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {requiredDocuments.map((doc, idx) => (
                            <tr key={idx} className={editingCatIndex === idx ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'}>
                              <td className="px-3 py-2.5 font-medium text-slate-800 break-words">{doc.name}</td>
                              <td className="px-3 py-2.5 text-slate-500 break-words">{doc.description || <span className="italic text-slate-300">--</span>}</td>
                              {!isViewOnly && (
                                <td className="px-3 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleEditCategory(idx)}
                                      className="text-blue-600 hover:text-blue-800 transition-colors"
                                      title="Edit"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCategory(idx)}
                                      className="text-slate-400 hover:text-red-500 transition-colors"
                                      title="Remove"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

              {/* RIGHT COLUMN: Timeline & Tasks (col-span-8) */}
              <div className="col-span-12 md:col-span-4 space-y-6">
                {/* Task Execution Pools */}
                <div className="flex flex-col gap-4">
                  {/* Task Makers */}
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-bold uppercase text-slate-600">Task Makers</label>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {taskMakers?.length === 0 ? <span className="text-[10px] text-slate-400">None selected</span> : taskMakers.map(id => (
                        <span key={id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 border border-slate-200">
                          {userMap[id] || id}
                          {!isViewOnly && (
                            <button type="button" onClick={() => removeMaker(id)} className="text-slate-400 hover:text-red-500">✕</button>
                          )}
                        </span>
                      ))}
                      {errors.taskMakers && (
                        <p className="mt-1 text-[10px] text-red-500">{errors.taskMakers.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Task Checkers */}
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-bold uppercase text-slate-600">Task Checkers</label>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {taskCheckers?.length === 0 ? <span className="text-[10px] text-slate-400">None selected</span> : taskCheckers.map(id => (
                        <span key={id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 border border-slate-200">
                          {userMap[id] || id}
                          {!isViewOnly && (
                            <button type="button" onClick={() => removeChecker(id)} className="text-slate-400 hover:text-red-500">✕</button>
                          )}
                        </span>
                      ))}
                      {errors.taskCheckers && (
                        <p className="mt-1 text-[10px] text-red-500">{errors.taskCheckers.message}</p>
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>

          <div className="border-t border-slate-200 p-4 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
            {!isViewOnly && (
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-white">
                Cancel
              </button>
            )}
            {!isViewOnly && (
              <button type="submit" className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700">
                {editingTask ? 'Edit' : 'Save'} Task Template
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}