import { useEffect, useState } from 'react';
import { saveCategoryAccessAssignments } from '../services/api';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const ACCESS_PERMISSIONS_ARR = [
  {
    id: "creators",
    title: "SOP Creators",
    description: "Allowed to draft new SOP specifications",
  },
  {
    id: "approvers",
    title: "SOP Approvers",
    description: "Allowed to review & approve SOP drafts",
  },
  {
    id: "makers",
    title: "Task Submitters (Makers)",
    description: "Allowed to execute & submit compliance tasks",
  },
  {
    id: "checkers",
    title: "Task Approvers (Checkers)",
    description: "Allowed to verify & approve compliance tasks",
  },
];

const accessControlSchema = z.object({
  creators: z.array(z.string()).default([]),
  approvers: z.array(z.string()).default([]),
  makers: z.array(z.string()).default([]),
  checkers: z.array(z.string()).default([]),
});

export default function AccessControlForm({
  activeCategory,
  getUserNames,
  handleOpenUserPicker,
  onSave,
  creatorsList,
  approversList,
  makersList,
  checkersList,
}) {
  const [error, setError] = useState(null);

  const {
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(accessControlSchema),
    defaultValues: {
      creators: [],
      approvers: [],
      makers: [],
      checkers: [],
    },
  });

  const creators = useWatch({ control, name: 'creators' }) || [];
  const approvers = useWatch({ control, name: 'approvers' }) || [];
  const makers = useWatch({ control, name: 'makers' }) || [];
  const checkers = useWatch({ control, name: 'checkers' }) || [];

  const roleMap = { creators, approvers, makers, checkers };

  // Sync internal RHF state whenever UserPicker updates parent state props
  useEffect(() => {
    if (activeCategory) {
      reset({
        creators: creatorsList || [],
        approvers: approversList || [],
        makers: makersList || [],
        checkers: checkersList || [],
      });
    }
  }, [activeCategory, creatorsList, approversList, makersList, checkersList, reset]);

  const onSubmit = async (data) => {
    if (!activeCategory) return;
    const catCode = activeCategory.categoryCode || activeCategory.categoryName;
    setError(null);

    try {
      const updated = await saveCategoryAccessAssignments({
        processCategory: catCode,
        creatorUserIds: data.creators,
        approverUserIds: data.approvers,
        makerUserIds: data.makers,
        checkerUserIds: data.checkers,
      });

      onSave(updated, catCode);
    } catch (err) {
      console.error('Failed to save access control:', err);
      setError('Failed to save access control: ' + err.message);
    }
  };

  return (
    <form
      id="access-control-form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-[18px]"
    >
      <div className="flex flex-col gap-1.5 min-w-0">
        <span className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">
          Process Category (Read-Only)
        </span>
        <input
          type="text"
          value={
            activeCategory
              ? `${activeCategory.categoryName} (${activeCategory.categoryCode})`
              : ''
          }
          disabled
          className="w-full px-3 py-[10px] border border-[#cbd5e1] rounded-[8px] text-[13px] bg-[#f1f5f9] text-[#475569] font-semibold outline-none cursor-not-allowed box-border"
        />
      </div>

      {ACCESS_PERMISSIONS_ARR.map((item) => {
        const role = roleMap[item.id] || [];

        return (
          <div key={item.id} className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">
              {item.title}
            </span>
            <div
              onClick={() => handleOpenUserPicker(item.id)}
              className="flex items-center justify-between p-[10px_14px] border border-[#cbd5e1] rounded-[8px] bg-bg-surface cursor-pointer hover:border-[#94a3b8] transition-colors duration-150"
            >
              <div>
                <div
                  className={`text-[13px] font-semibold ${
                    role.length ? 'text-text-primary' : 'text-[#94a3b8]'
                  }`}
                >
                  {getUserNames(role)}
                </div>
                <div className="text-[11px] text-text-muted mt-0.5">
                  {item.description}
                </div>
              </div>
              <span className="bg-[#f1f5f9] border border-[#cbd5e1] text-[#0284c7] p-[4px_10px] rounded-[6px] text-[12px] font-bold">
                {role.length} Selected
              </span>
            </div>
          </div>
        );
      })}

      {error && <p className="text-[13px] text-red-600 font-medium">{error}</p>}
    </form>
  );
}