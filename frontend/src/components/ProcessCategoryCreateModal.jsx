import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createProcessCategory } from '../services/api';

const categorySchema = z.object({
  code: z
    .string()
    .min(1, 'Category Code is required'),
  name: z.string().min(3, 'Category Name must be at least 3 characters'),
  description: z.string().max(200, 'Description cannot exceed 200 characters').optional(),
});


export default function ProcessCategoryCreateModal({ onSuccess, onClose, onError }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: '',
      name: '',
      description: ''
    },
  });

  const onSubmit = async (data) => {

    try {
      await createProcessCategory({
        categoryCode: data.code.trim(),
        categoryName: data.name.trim(),
        description: data.description?.trim() || '',
      });
      reset();
      onSuccess()
    } catch (err) {
      console.error('Failed to create process category:', err);
      onError('Failed to create process category: ' + err.message);
    }
  };
  return (
    <>
      <div className="fixed inset-0 bg-[#0f172a]/50 flex items-center justify-center z-[1000] p-4">
        <div className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-[modalFade_0.2s_ease-out]"
          onClick={e => e.stopPropagation()}>

          <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-2 sm:px-7 pb-[18px] pt-6">
            <h2 className="m-0 text-lg font-bold text-slate-900">
              Create Process Category
            </h2>

            <button
              type="button"
              className="rounded-md p-1 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-900 cursor-pointer"
              onClick={onClose}
              title="Close modal"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto px-2 sm:px-7 py-6">

            <form onSubmit={handleSubmit(onSubmit)} className=" flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ">
                  Category Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. TAX_COMPLIANCE"
                  {...register('code')}
                  className="w-full p-[9px_12px] border border-[#cbd5e1] rounded-[6px]  bg-[#f8fafc] text-[13px] text-text-primary outline-none transition-all duration-150 focus:border-[#2563eb] focus:bg-bg-surface focus:ring-3 focus:ring-[rgba(37,99,235,0.15)]"
                />
                {errors.code && (
                  <p className=" text-red-500 text-[12px] mt-1">{errors.code.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ">
                  Category Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tax Compliance"
                  {...register('name')}
                  className="w-full p-[9px_12px] border border-[#cbd5e1] rounded-[6px] text-[13px] bg-[#f8fafc] text-text-primary outline-none transition-all duration-150 focus:border-[#2563eb] focus:bg-bg-surface focus:ring-3 focus:ring-[rgba(37,99,235,0.15)]"
                />
                {errors.name && (
                  <p className=" text-red-500 text-[12px] mt-1">{errors.name.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Operational scope of compliance area"
                  {...register('description')}
                  className="w-full p-[9px_12px] border border-[#cbd5e1] rounded-[6px] bg-[#f8fafc] text-[13px] text-text-primary resize-y outline-none transition-all duration-150 focus:border-[#2563eb] focus:bg-bg-surface focus:ring-3 focus:ring-[rgba(37,99,235,0.15)]"
                />
                {errors.description && (
                  <p className=" text-red-500 text-[12px] mt-1">{errors.description.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1] rounded-[6px] text-[13px] font-semibold cursor-pointer transition-colors duration-150 hover:bg-[#e2e8f0] hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-[18px] py-2 bg-[#0284c7] text-white border-none rounded-[6px] text-[13px] font-bold cursor-pointer transition-colors duration-150 hover:bg-[#0369a1] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>

          </div>

        </div>
      </div>
    </>
  )
}