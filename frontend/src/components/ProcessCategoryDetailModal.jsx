import { useState, useEffect } from 'react';
import { updateProcessCategory, getCategoryActivityLogs } from '../services/api';
import Toast from './Toast';
import CategoryActivityLogModal from './CategoryActivityLogModal.jsx';

export default function ProcessCategoryDetailModal({ isOpen, category, onClose, onUpdated }) {
  const [activeTab, setActiveTab] = useState('DETAILS'); // 'DETAILS' | 'ACTIVITY'
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showActivityLogModal, setShowActivityLogModal] = useState(false)

  useEffect(() => {
    if (category) {
      setName(category.categoryName || '');
      setDescription(category.description || '');
      setErrorMsg('');
      if (activeTab === 'ACTIVITY') {
        fetchLogs(category.categoryCode);
      }
    }
  }, [category, activeTab]);

  if (!isOpen || !category) return null;

  async function fetchLogs(code) {
    setLoadingLogs(true);
    try {
      const data = await getCategoryActivityLogs(code);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Category Name is required.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      await updateProcessCategory(category.categoryCode, {
        categoryCode: category.categoryCode,
        categoryName: name.trim(),
        description: description.trim(),
      });
      if (onUpdated) onUpdated(`Process Category '${category.categoryCode}' updated successfully.`);
      onClose();
    } catch (err) {
      console.error('Failed to update process category:', err);
      setErrorMsg(err.message || 'Failed to update process category');
    } finally {
      setSaving(false);
    }
  }

  async function openActivityLogs(code){
    await fetchLogs(code)
    setShowActivityLogModal(true)
  }

  const historyLength = logs.length;

  return (
    <>
      <div
        className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/60 p-5 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-[580px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-[modalFade_0.2s_ease-out]"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50 px-7 pb-[18px] pt-6">
            <div className="flex flex-col">
              <h3 className="mb-1.5 text-lg font-bold text-slate-900">Process Category: {category.categoryName}</h3>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-[#1a2b6b]/[0.08] px-2.5 py-0.5 font-mono text-xs font-semibold text-[#1a2b6b]">
                  {category.categoryCode}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">

              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-blue-600/25 bg-blue-600/[0.08] px-3 py-1.5 text-xs font-semibold text-blue-600 transition-all hover:bg-blue-600/[0.15]"
                onClick={() => openActivityLogs(category.categoryCode)}
                title="Open SOP Category Log History"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Open Activity Log</span>
                
              </button>

              <button
                type="button"
                className="rounded-md p-1 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-900"
                onClick={onClose}
                title="Close modal"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

            </div>


          </div>
          
          {/* Modal Body */}
          <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto px-7 py-6">
            {/* Tab 1: Category Details Form */}

            <form id="category-edit-form" onSubmit={handleSave} className="flex flex-col gap-4.5">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Category Code (Read-Only)</span>
                <input
                  type="text"
                  value={category.categoryCode}
                  disabled
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3.5 py-2.5 font-mono text-xs font-semibold text-sky-600"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Category Name *</span>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter Category Name"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Description</span>
                <textarea
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Enter category scope and description"
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-7 py-4">
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-4.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
              onClick={onClose}
            >
              Close
            </button>

            <button
              type="submit"
              form="category-edit-form"
              className="rounded-lg border border-blue-600 bg-blue-600 px-4.5 py-2 text-xs font-semibold text-white transition-all hover:border-blue-700 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
            >
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>

          </div>

          {/* Floating Toast Notifications for Errors */}
          <Toast
            message={errorMsg}
            type="error"
            onClose={() => setErrorMsg('')}
          />
        </div>
      </div>

      <CategoryActivityLogModal isOpen={showActivityLogModal}
        categoryLogs={logs}
        onClose={() => setShowActivityLogModal(false)} />
    </>
  );
}
