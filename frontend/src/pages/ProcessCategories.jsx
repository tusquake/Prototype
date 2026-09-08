import { useState, useEffect } from 'react';
import ProcessCategoryDetailModal from '../components/ProcessCategoryDetailModal';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { getProcessCategories, createProcessCategory, deleteProcessCategory } from '../services/api';
import TableSkeleton from '../components/TableSkeleton';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;

export default function ProcessCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deletingCode, setDeletingCode] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Creation Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');


  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    setError(null);
    try {
      const data = await getProcessCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch process categories:', err);
      setError('Failed to load process categories: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError('Category Code and Category Name are required.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await createProcessCategory({
        categoryCode: code.trim(),
        categoryName: name.trim(),
        description: description.trim(),
      });
      setSuccessMsg('Process Category created successfully.');
      setCode('');
      setName('');
      setDescription('');
      setShowCreateModal(false);
      await fetchCategories();
    } catch (err) {
      console.error('Failed to create process category:', err);
      setError('Failed to create process category: ' + err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteCategoryTarget) return;
    const categoryCode = deleteCategoryTarget;
    setDeletingCode(categoryCode);
    setError(null);

    try {
      await deleteProcessCategory(categoryCode);
      setSuccessMsg(`Process Category '${categoryCode}' deleted successfully.`);
      setDeleteCategoryTarget(null);
      await fetchCategories();
    } catch (err) {
      console.error('Failed to delete process category:', err);
      setError('Failed to delete process category: ' + err.message);
    } finally {
      setDeletingCode(null);
    }
  }

  const filteredCategories = categories.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.categoryCode && c.categoryCode.toLowerCase().includes(q)) ||
      (c.categoryName && c.categoryName.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  function resetFilters() {
    setSearchQuery('');
    setCurrentPage(1);
  }

  const isFiltered = searchQuery.trim() !== ''

  const paginatedCategories = filteredCategories.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <div className="p-6 md:px-8 w-full max-w-full box-border">

        {/* Action & Filter Bar on Top of Table */}

        <div className="relative z-10 flex flex-wrap items-end gap-3 mb-6 bg-bg-surface p-[16px_20px] rounded-[12px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.04)] w-full box-border overflow-visible">
          <div className="relative flex flex-col gap-1.5 flex-[1.5] min-w-[220px]">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Search Category</span>
            <div className="relative flex items-center w-full">
              <svg className="absolute left-3 text-[#94a3b8] pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="w-full h-[40px] pl-[38px] pr-[14px] bg-bg-surface border border-[#cbd5e1] rounded-[8px] text-[13.5px] text-text-primary outline-none transition-all duration-150 box-border focus:border-[#2563eb] focus:ring-3 focus:ring-[rgba(37,99,235,0.1)]"
                placeholder="Search category code, name or description..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {isFiltered && (
            <button
              type="button"
              className="bg-[#f1f5f9] border border-[#cbd5e1] text-[#475569] text-[12.5px] font-semibold px-4 h-[40px] rounded-[8px] cursor-pointer transition-all duration-150 whitespace-nowrap inline-flex items-center gap-1.5 hover:bg-[#e2e8f0] hover:text-text-primary"
              onClick={resetFilters}
              title="Reset all filters"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Reset Filters</span>
            </button>
          )}
        </div>


        <div className="bg-bg-surface border border-[#e2e8f0] border-t-0 rounded-b-[10px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between px-6 py-[18px] bg-bg-surface border-b border-[#f1f5f9]">
            <span className="text-[14.5px] font-bold text-[#1e293b] flex items-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a2b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 inline-block align-middle">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              SOP Categories
            </span>

            <div className="flex gap-2.5 items-center">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[6px] bg-[#0284c7] text-white text-[12.5px] font-semibold border-none cursor-pointer shadow-sm transition-all duration-150 hover:bg-[#0369a1]"
                onClick={() => setShowCreateModal(true)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="17" y1="11" x2="23" y2="11" />
                </svg>
                <span>Create Process Category</span>
              </button>
            </div>

          </div>

          {/* Categories Table View */}

          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-[11px] uppercase tracking-[0.6px] bg-bg-surface px-6 py-3">
              <thead>
                <tr className=" border-b border-[#e2e8f0]  text-left text-[11px] uppercase tracking-[0.5px]">
                  <th className="px-4 py-3 w-[220px] text-[#94a3b8]">Category Code</th>
                  <th className="px-4 py-3 w-[260px] text-[#94a3b8]">Category Name</th>
                  <th className="px-4 py-3 text-[#94a3b8]">Description</th>
                  <th className="px-4  py-3 text-right  text-[#94a3b8]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={4} columns={4} />
                ) : paginatedCategories.length === 0 ? (
                  <tr><td colSpan={7} className="text-center p-12 text-[#94a3b8] text-[13.5px]">No process categories found matching your query.</td></tr>
                ) : filteredCategories.map(cat => (
                  <tr key={cat.id || cat.categoryCode} className="border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]">
                    <td className="px-4 py-3.5 font-mono font-semibold text-[#334155] align-middle">
                      {cat.categoryCode}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-[#334155] align-middle">
                      {cat.categoryName}
                    </td>
                    <td className="px-4 py-3.5 text-[#334155] align-middle">
                      {cat.description || 'No description provided'}
                    </td>
                    <td className="px-4 py-3.5 text-right flex gap-2 justify-end align-middle">
                      <button
                        type="button"
                        onClick={() => setEditingCategory(cat)}
                        className="bg-[#f0f9ff] border border-[#bae6fd] text-[#0284c7] rounded-[4px] px-3 py-[5px] cursor-pointer text-[12px] font-semibold transition-colors duration-150 hover:bg-[#e0f2fe] inline-flex items-center gap-1"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCategoryTarget(cat.categoryCode)}
                        className="bg-[#fee2e2] border border-[#fca5a5] text-[#b91c1c] rounded-[4px] px-3 py-[5px] cursor-pointer text-[12px] font-semibold transition-colors duration-150 hover:bg-[#fca5a5]/40 inline-flex items-center gap-1"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredCategories.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemLabel="Categories"
            />
          )}
        </div>
      </div>

      {/* Modal for Creating New Process Category */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[#0f172a]/50 flex items-center justify-center z-[1000] p-4">
          <div className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-[modalFade_0.2s_ease-out]"
            onClick={e => e.stopPropagation()}>

            <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-7 pb-[18px] pt-6">
              <h2 className="m-0 text-lg font-bold text-slate-900">
                Create Process Category
              </h2>

              <button
              type="button"
              className="rounded-md p-1 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-900"
              onClick={() => setShowCreateModal(false)}
              title="Close modal"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            </div>

            <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto px-7 py-6">

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ">
                  Category Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. TAX_COMPLIANCE"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  required
                  className="w-full p-[9px_12px] border border-[#cbd5e1] rounded-[6px] text-[13px] bg-[#f8fafc] text-text-primary outline-none transition-all duration-150 focus:border-[#2563eb] focus:bg-bg-surface focus:ring-3 focus:ring-[rgba(37,99,235,0.15)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ">
                  Category Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tax Compliance"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full p-[9px_12px] border border-[#cbd5e1] rounded-[6px] text-[13px] bg-[#f8fafc] text-text-primary outline-none transition-all duration-150 focus:border-[#2563eb] focus:bg-bg-surface focus:ring-3 focus:ring-[rgba(37,99,235,0.15)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Operational scope of compliance area"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-[9px_12px] border border-[#cbd5e1] rounded-[6px] text-[13px] bg-[#f8fafc] text-text-primary resize-y outline-none transition-all duration-150 focus:border-[#2563eb] focus:bg-bg-surface focus:ring-3 focus:ring-[rgba(37,99,235,0.15)]"
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1] rounded-[6px] text-[13px] font-semibold cursor-pointer transition-colors duration-150 hover:bg-[#e2e8f0] hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-[18px] py-2 bg-[#0284c7] text-white border-none rounded-[6px] text-[13px] font-bold cursor-pointer transition-colors duration-150 hover:bg-[#0369a1] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>

            </div>

          </div>
        </div>
      )}

      {/* Modal for Editing & Activity Log Details */}
      <ProcessCategoryDetailModal
        isOpen={!!editingCategory}
        category={editingCategory}
        onClose={() => setEditingCategory(null)}
        onUpdated={(msg) => {
          fetchCategories();
          setSuccessMsg(msg || 'Process Category updated successfully.');
        }}
      />

      {/* Custom Confirmation Modal for Deleting Category */}
      <ConfirmationModal
        isOpen={!!deleteCategoryTarget}
        title="Delete Process Category"
        message={`Are you sure you want to delete process category '${deleteCategoryTarget}'? This action cannot be undone.`}
        confirmText={deletingCode ? 'Deleting...' : 'Delete Category'}
        confirmVariant="danger"
        submitting={!!deletingCode}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteCategoryTarget(null)}
      />

      {/* Floating Toast Notifications */}
      <Toast
        message={successMsg}
        type="success"
        onClose={() => setSuccessMsg(null)}
      />
      <Toast
        message={error}
        type="error"
        onClose={() => setError(null)}
      />
    </>
  );
}
