import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ProcessCategoryDetailModal from '../components/ProcessCategoryDetailModal';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { getProcessCategories, createProcessCategory, deleteProcessCategory } from '../services/api';
import { getSession } from '../auth/auth';

export default function ProcessCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // Selected category for detail/activity modal
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null); // Selected category code for deletion
  const [creating, setCreating] = useState(false);
  const [deletingCode, setDeletingCode] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Creation Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const session = getSession();
  const currentUser = session?.user;

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

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-text-primary">
      <main className="ml-[248px] flex-1 min-w-0 bg-bg-base">
        {/* Standardized Master-Detail Top Header */}
        <div className="w-full bg-[#f8fafc] border-b border-[#cbd5e1] px-8 py-[18px] shadow-sm box-border">
          <div className="flex items-center justify-between gap-4 w-full max-w-full box-border">
            <div>
              <h2 className="text-[22px] font-bold text-[#1e293b]">Process Category Management</h2>
              <p className="text-[13.5px] text-text-muted mt-1">
                Define and manage operational categories used across SOP master definitions and compliance task workflows.
              </p>
            </div>
          </div>
        </div>

        {/* Page Content View */}
        <div className="p-6 md:px-8 w-full max-w-full box-border">
          {/* Action & Filter Bar on Top of Table */}
          <div className="bg-bg-surface border border-[#e2e8f0] rounded-t-[10px] p-[16px_20px] flex items-center justify-between gap-4">
            <div className="flex-1 max-w-[360px]">
              <input
                type="text"
                placeholder="Search category code or name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-[#cbd5e1] rounded-[6px] text-[13px] bg-[#f8fafc] text-[#0f172a] outline-none transition-all duration-150 focus:border-[#2563eb] focus:bg-bg-surface focus:ring-3 focus:ring-[rgba(37,99,235,0.1)]"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-[18px] py-[9px] bg-[#0284c7] text-white border-none rounded-[6px] text-[13px] font-bold cursor-pointer flex items-center gap-1.5 transition-colors duration-150 hover:bg-[#0369a1]"
            >
              <span>+ Create Process Category</span>
            </button>
          </div>

          {/* Categories Table View */}
          <div className="bg-bg-surface border border-[#e2e8f0] border-t-0 rounded-b-[10px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            {loading ? (
              <div className="p-10 text-center text-text-muted text-[13px]">
                Loading process categories...
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-10 text-center text-text-muted text-[13px]">
                No process categories found matching your query.
              </div>
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#475569] text-left text-[11px] uppercase tracking-[0.5px]">
                    <th className="px-4 py-3 w-[220px]">Category Code</th>
                    <th className="px-4 py-3 w-[260px]">Category Name</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right w-[160px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map(cat => (
                    <tr key={cat.id || cat.categoryCode} className="border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]">
                      <td className="px-4 py-3.5 font-mono font-semibold text-[#0284c7] align-middle">
                        {cat.categoryCode}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-text-primary align-middle">
                        {cat.categoryName}
                      </td>
                      <td className="px-4 py-3.5 text-text-muted align-middle">
                        {cat.description || 'No description provided'}
                      </td>
                      <td className="px-4 py-3.5 text-right flex gap-2 justify-end align-middle">
                        <button
                          type="button"
                          onClick={() => setEditingCategory(cat)}
                          className="bg-[#f0f9ff] border border-[#bae6fd] text-[#0284c7] rounded-[4px] px-3 py-[5px] cursor-pointer text-[12px] font-semibold transition-colors duration-150 hover:bg-[#e0f2fe]"
                        >
                          Edit &amp; Details
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCategoryTarget(cat.categoryCode)}
                          className="bg-[#fee2e2] border border-[#fca5a5] text-[#b91c1c] rounded-[4px] px-3 py-[5px] cursor-pointer text-[12px] font-semibold transition-colors duration-150 hover:bg-[#fca5a5]/40"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal for Creating New Process Category */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-[#0f172a]/50 flex items-center justify-center z-[1000] p-4">
            <div className="bg-bg-surface rounded-[12px] p-6 w-full max-w-[500px] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)]">
              <h2 className="text-[16px] font-bold text-[#0f172a] m-0 mb-4">
                Create Process Category
              </h2>

              <form onSubmit={handleCreate} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#475569] mb-1">
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

                <div>
                  <label className="block text-[12px] font-semibold text-[#475569] mb-1">
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

                <div>
                  <label className="block text-[12px] font-semibold text-[#475569] mb-1">
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

      </main>
    </div>
  );
}
