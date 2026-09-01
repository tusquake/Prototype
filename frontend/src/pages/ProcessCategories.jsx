import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getProcessCategories, createProcessCategory, deleteProcessCategory } from '../services/api';
import { getSession } from '../auth/auth';
import styles from './AuditLogs.module.css';

export default function ProcessCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingCode, setDeletingCode] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
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
      setShowModal(false);
      await fetchCategories();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to create process category:', err);
      setError('Failed to create process category: ' + err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(categoryCode) {
    if (!window.confirm(`Are you sure you want to delete process category '${categoryCode}'?`)) {
      return;
    }

    setDeletingCode(categoryCode);
    setError(null);

    try {
      await deleteProcessCategory(categoryCode);
      setSuccessMsg(`Process Category '${categoryCode}' deleted successfully.`);
      await fetchCategories();
      setTimeout(() => setSuccessMsg(null), 3000);
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
    <div className={styles.layout}>
      <Sidebar currentUser={currentUser} />

      <main className={styles.main}>
        {/* Top Title Bar */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Process Category Management
            </h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
              Define and manage operational categories used across SOP master definitions and compliance task workflows.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 20, fontWeight: 600 }}>
            {successMsg}
          </div>
        )}

        {/* Action & Filter Bar on Top of Table */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px 10px 0 0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1, maxWidth: 360 }}>
            <input
              type="text"
              placeholder="Search category code or name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, background: '#f8fafc', color: '#0f172a' }}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{ padding: '9px 18px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>+ Create Process Category</span>
          </button>
        </div>

        {/* Categories Table View */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              Loading process categories...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              No process categories found matching your query.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '12px 16px', width: 220 }}>Category Code</th>
                  <th style={{ padding: '12px 16px', width: 260 }}>Category Name</th>
                  <th style={{ padding: '12px 16px' }}>Description</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map(cat => (
                  <tr key={cat.id || cat.categoryCode} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#0284c7' }}>
                      {cat.categoryCode}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>
                      {cat.categoryName}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>
                      {cat.description || 'No description provided'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        disabled={deletingCode === cat.categoryCode}
                        onClick={() => handleDelete(cat.categoryCode)}
                        style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                      >
                        {deletingCode === cat.categoryCode ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal for Creating New Process Category */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#ffffff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
                Create Process Category
              </h2>

              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Category Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TAX_COMPLIANCE"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    required
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, background: '#f8fafc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Category Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tax Compliance"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, background: '#f8fafc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Operational scope of compliance area"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, background: '#f8fafc', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    style={{ padding: '8px 18px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {creating ? 'Creating...' : 'Create Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
