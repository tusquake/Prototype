import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
// import UserPickerModal from "./UserPickerModal"; // Assuming this is used elsewhere

const taskSchema = z.object({
  taskTitle: z.string().trim().min(1, 'Task Name is required.'),
  taskDependencyMode: z.string(),
  taskEndDate: z.coerce.number().min(0, 'Completion Deadline must be at least 0.'),
  taskLevelDocs: z.array(z.string()),
  taskMakers: z.array(z.string()).min(1, 'Please select at least one Maker for this task.'),
  taskCheckers: z.array(z.string()).min(1, 'Please select at least one Checker for this task.'),
});

export default function CreateTaskTemplateModal({
  isOpen,
  onClose,
  onSaveTask,
  existingTasksCount,
  userMap,
  parentMakerPool,
  parentCheckerPool,
  sopEndDate,
  setCurrentStep,
  frequency,
  dueDayOffset,
  editingTask = null,
  isViewOnly = false,
}) {
  const [newDocName, setNewDocName] = useState('');

  const getMaxDays = (freq) => {
    switch (freq?.toUpperCase()) {
      case 'WEEKLY': return 7;
      case 'MONTHLY': return 31;
      case 'QUARTERLY': return 90;
      case 'ANNUAL': return 365;
      default: return 30; // Default fallback
    }
  };

  const maxDeadline = getMaxDays(frequency);

  const {
    register,
    handleSubmit,
    reset,
    watch,
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
      taskLevelDocs: []
    }
  });

  // Watch array fields to manually render them since they aren't standard inputs
  const taskEndDate = useWatch({ control, name: 'taskEndDate' })
  const taskMakers = useWatch({ control, name: 'taskMakers' })
  const taskCheckers = useWatch({ control, name: 'taskCheckers' })
  const taskLevelDocs = useWatch({ control, name: 'taskLevelDocs' })
  console.log('Editing Task', editingTask)

  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        reset({
          taskTitle: editingTask.title || '',
          taskDependencyMode: editingTask.dependencyMode || 'INDEPENDENT',
          taskEndDate: editingTask.etaEndDay !== undefined ? editingTask.etaEndDay : 31,
          taskMakers: editingTask.makers || [],
          taskCheckers: editingTask.checkers || [],
          taskLevelDocs: editingTask.requiredDocs || []
        });
      } else {
        reset({
          taskTitle: '',
          taskDependencyMode: existingTasksCount === 0 ? 'INDEPENDENT' : 'DEPENDENT_ON_PREVIOUS',
          taskEndDate: Math.min(dueDayOffset, maxDeadline),
          taskMakers: [...parentMakerPool],
          taskCheckers: [...parentCheckerPool],
          taskLevelDocs: []
        });
      }
      setNewDocName('');
    }
  }, [isOpen, editingTask, existingTasksCount, parentMakerPool, parentCheckerPool, reset]);

  if (!isOpen) return null;

  const handleAddDoc = () => {
    if (isViewOnly) return;
    const trimmed = newDocName.trim();
    if (!trimmed) return;

    const currentDocs = getValues('taskLevelDocs');
    if (currentDocs.includes(trimmed)) {
      setError('taskLevelDocs', { type: 'manual', message: 'Document already exists in checklist.' });
      return;
    }

    setValue('taskLevelDocs', [...currentDocs, trimmed], { shouldValidate: true });
    setNewDocName('');
    clearErrors('taskLevelDocs');
  };

  const removeDoc = (doc) => {
    if (isViewOnly) return;
    setValue('taskLevelDocs', taskLevelDocs.filter(d => d !== doc), { shouldValidate: true });
  };

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

    const newTaskTemplate = {
      id: editingTask ? editingTask.id : `task-template-${Date.now()}`,
      taskTemplateId: editingTask ? editingTask.taskTemplateId : null,
      stepSequence: editingTask ? editingTask.stepSequence : existingTasksCount + 1,
      title: data.taskTitle,
      dependencyMode: data.taskDependencyMode,
      etaStartDay: data.taskStartDate,
      etaEndDay: data.taskEndDate,
      requiredDocs: data.taskLevelDocs,
      makers: data.taskMakers,
      checkers: data.taskCheckers,
      savedToBackend: !!editingTask?.taskTemplateId,
    };

    onSaveTask(newTaskTemplate, !!editingTask);
  };

  // Convert string arrays to object arrays for UserPickerModal compatibility (if needed down the line)
  const formattedParentMakers = parentMakerPool.map(id => ({ id, name: userMap[id] || id }));
  const formattedParentCheckers = parentCheckerPool.map(id => ({ id, name: userMap[id] || id }));

  // Get the first error message to display in the top banner (matching original behavior)
  const firstError = Object.values(errors)[0]?.message;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              {isViewOnly ? `View Step ${editingTask?.stepSequence || 1} Task Details` : editingTask ? `Edit Step ${editingTask.stepSequence} Task Template` : `Create Step ${existingTasksCount + 1} Task Template`}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Define task template details for this execution step.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
        </div>

        {/* Changed to form wrapper to handle submit */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Matches original single error banner */}
            {firstError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-600">
                {firstError}
              </div>
            )}

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
                    stepSequence-1 : existingTasksCount}</option>}
                </select>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">Task Timeline & ETA Days</h4>
              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-blue-800 mb-1">
                    Completion Deadline (ETA) *
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-blue-700">Day</span>
                    <input
                      type="number"
                      min={1}
                      max={Math.min(dueDayOffset, maxDeadline)}
                      disabled={isViewOnly}
                      {...register('taskEndDate', { valueAsNumber: true, onChange: () => clearErrors('taskEndDate') })}
                      className="w-full rounded-lg border border-blue-300 bg-white p-2 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">By Day {taskEndDate} of SOP period</span>
                </div>
              </div>
            </div>

            {/* Task Level Documents */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Required Task Documents</h4>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  disabled={isViewOnly}
                  placeholder="e.g. Form 16B"
                  value={newDocName}
                  onChange={(e) => {
                    setNewDocName(e.target.value);
                    if (errors.taskLevelDocs) clearErrors('taskLevelDocs');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDoc())}
                  className="flex-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                />
                <button
                  type="button"
                  disabled={isViewOnly}
                  onClick={handleAddDoc}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-slate-400"
                >
                  + Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {taskLevelDocs.length === 0 ? (
                  <span className="text-[11px] italic text-slate-400">No documents required for this step.</span>
                ) : (
                  taskLevelDocs.map(doc => (
                    <span key={doc} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                      {doc}
                      {!isViewOnly && (
                        <button type="button" onClick={() => removeDoc(doc)} className="text-blue-400 hover:text-red-500 font-bold">✕</button>
                      )}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Task Execution Pools */}
            <div className="grid grid-cols-2 gap-4">
              {/* Task Makers */}
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase text-slate-600">Task Makers</label>
                </div>
                <div className="flex flex-wrap gap-1">
                  {taskMakers.length === 0 ? <span className="text-[10px] text-slate-400">None selected</span> : taskMakers.map(id => (
                    <span key={id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 border border-slate-200">
                      {userMap[id] || id}
                      {!isViewOnly && (
                        <button type="button" onClick={() => removeMaker(id)} className="text-slate-400 hover:text-red-500">✕</button>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Task Checkers */}
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase text-slate-600">Task Checkers</label>
                </div>
                <div className="flex flex-wrap gap-1">
                  {taskCheckers.length === 0 ? <span className="text-[10px] text-slate-400">None selected</span> : taskCheckers.map(id => (
                    <span key={id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 border border-slate-200">
                      {userMap[id] || id}
                      {!isViewOnly && (
                        <button type="button" onClick={() => removeChecker(id)} className="text-slate-400 hover:text-red-500">✕</button>
                      )}
                    </span>
                  ))}
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