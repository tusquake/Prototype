import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { getProcessCategories, getCategoryAccessAssignments, saveCategoryAccessAssignments } from '../services/api';
import { getSession } from '../auth/auth';
import styles from './AuditLogs.module.css';

const DEMO_USERS = [
  { id: 'usr-tushar-304', name: 'Tushar Seth', email: 'tushar@cloudkaptan.com', role: 'ADMIN' },
  { id: 'usr-vivek-108', name: 'Vivek Raj', email: 'vivek@cloudkaptan.com', role: 'NON_ADMIN' },
  { id: 'usr-mainak-215', name: 'Mainak Gupta', email: 'mainak@cloudkaptan.com', role: 'NON_ADMIN' },
  { id: 'usr-prayas-412', name: 'Prayasa Sharma', email: 'prayas@cloudkaptan.com', role: 'NON_ADMIN' },
  { id: 'usr-manoj-042', name: 'Manoj Kumar', email: 'manoj@cloudkaptan.com', role: 'NON_ADMIN' },
];

export default function AccessControl() {
  const [categories, setCategories] = useState([]);
  const [categoryAssignments, setCategoryAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Selected user IDs in modal form
  const [creators, setCreators] = useState([]);
  const [approvers, setApprovers] = useState([]);
  const [makers, setMakers] = useState([]);
  const [checkers, setCheckers] = useState([]);

  const session = getSession();
  const currentUser = session?.user;

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    setError(null);
    try {
      const catList = await getProcessCategories();
      const list = Array.isArray(catList) ? catList : [];
      setCategories(list);

      const assignmentsMap = {};
      for (const cat of list) {
        const code = cat.categoryCode || cat.categoryName;
        const assignData = await getCategoryAccessAssignments(code).catch(() => null);
        if (assignData) {
          assignmentsMap[code] = assignData;
        }
      }
      setCategoryAssignments(assignmentsMap);
    } catch (err) {
      console.error('Failed to load access control data:', err);
      setError('Failed to load access control data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenConfigureModal(cat) {
    const code = cat.categoryCode || cat.categoryName;
    setActiveCategory(cat);
    const existing = categoryAssignments[code];
    if (existing) {
      setCreators(existing.creatorUserIds || []);
      setApprovers(existing.approverUserIds || []);
      setMakers(existing.makerUserIds || []);
      setCheckers(existing.checkerUserIds || []);
    } else {
      setCreators([]);
      setApprovers([]);
      setMakers([]);
      setCheckers([]);
    }
  }

  function handleToggleUser(userId, listType) {
    const updateFn = {
      creators: setCreators,
      approvers: setApprovers,
      makers: setMakers,
      checkers: setCheckers,
    }[listType];

    updateFn(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }

  async function handleSaveAccess(e) {
    e.preventDefault();
    if (!activeCategory) return;
    const catCode = activeCategory.categoryCode || activeCategory.categoryName;

    setSaving(true);
    setError(null);

    try {
      const updated = await saveCategoryAccessAssignments({
        processCategory: catCode,
        creatorUserIds: creators,
        approverUserIds: approvers,
        makerUserIds: makers,
        checkerUserIds: checkers,
      });

      setCategoryAssignments(prev => ({
        ...prev,
        [catCode]: updated,
      }));

      setSuccessMsg(`Access permissions saved successfully for category '${catCode}'.`);
      setActiveCategory(null);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Failed to save access control:', err);
      setError('Failed to save access control: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function getUserNames(userIds = []) {
    if (!userIds || userIds.length === 0) return 'None assigned';
    const names = userIds.map(id => DEMO_USERS.find(u => u.id === id)?.name || id);
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
  }

  const filteredCategories = categories.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.categoryCode && c.categoryCode.toLowerCase().includes(q)) ||
      (c.categoryName && c.categoryName.toLowerCase().includes(q))
    );
  });

  const dualSopUsers = creators.filter(id => approvers.includes(id));
  const dualTaskUsers = makers.filter(id => checkers.includes(id));
  const hasSoDWarning = dualSopUsers.length > 0 || dualTaskUsers.length > 0;

  return (
    <div className={styles.layout}>
      <Sidebar currentUser={currentUser} />

      <main className={styles.main}>
        {/* Standardized Master-Detail Header */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderInner}>
            <div>
              <h2>Named Access Control Manager</h2>
              <p>Configure named user permissions for SOP creation, SOP approval, Task execution, and Task verification across process categories.</p>
            </div>
          </div>
        </div>

        {/* Page Content View */}
        <div className={styles.page}>
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

          {/* Filter Bar */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px 10px 0 0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, maxWidth: 380 }}>
              <input
                type="text"
                placeholder="Search category name or code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, background: '#f8fafc', color: '#0f172a' }}
              />
            </div>
          </div>

          {/* Categories Table View */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                Loading process categories and access permissions...
              </div>
            ) : filteredCategories.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                No process categories found.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '12px 16px', width: 220 }}>Process Category</th>
                    <th style={{ padding: '12px 16px' }}>SOP Creators</th>
                    <th style={{ padding: '12px 16px' }}>SOP Approvers</th>
                    <th style={{ padding: '12px 16px' }}>Task Submitters</th>
                    <th style={{ padding: '12px 16px' }}>Task Approvers</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', width: 140 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map(cat => {
                    const code = cat.categoryCode || cat.categoryName;
                    const assign = categoryAssignments[code] || {};

                    return (
                      <tr key={cat.id || code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{cat.categoryName}</div>
                          <div style={{ fontSize: 11, color: '#0284c7', fontFamily: 'monospace', marginTop: 2 }}>{code}</div>
                        </td>
                        <td style={{ padding: '14px 16px', color: assign.creatorUserIds?.length ? '#1e293b' : '#94a3b8', fontSize: 12 }}>
                          {getUserNames(assign.creatorUserIds)}
                        </td>
                        <td style={{ padding: '14px 16px', color: assign.approverUserIds?.length ? '#1e293b' : '#94a3b8', fontSize: 12 }}>
                          {getUserNames(assign.approverUserIds)}
                        </td>
                        <td style={{ padding: '14px 16px', color: assign.makerUserIds?.length ? '#1e293b' : '#94a3b8', fontSize: 12 }}>
                          {getUserNames(assign.makerUserIds)}
                        </td>
                        <td style={{ padding: '14px 16px', color: assign.checkerUserIds?.length ? '#1e293b' : '#94a3b8', fontSize: 12 }}>
                          {getUserNames(assign.checkerUserIds)}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenConfigureModal(cat)}
                            style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0284c7', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                          >
                            Configure Access
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal for Configuring Access Control per Category */}
        {activeCategory && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#ffffff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Configure Category Access: <span style={{ color: '#0284c7' }}>{activeCategory.categoryName}</span>
                  </h2>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>
                    Code: {activeCategory.categoryCode}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  style={{ background: 'transparent', border: 'none', fontSize: 18, color: '#64748b', cursor: 'pointer', fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>

              {hasSoDWarning && (
                <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', padding: '10px 14px', borderRadius: 8, fontSize: 12, color: '#873800', marginBottom: 16 }}>
                  <span style={{ fontWeight: 700 }}>Notice: Segregation of Duties (SoD) Active. </span>
                  Users assigned both Creator and Approver rights in this category are automatically prohibited by the security engine from self-approving their own drafts.
                </div>
              )}

              <form onSubmit={handleSaveAccess} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  
                  {/* 1. SOP Creators */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                      SOP Creators
                    </div>
                    <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 10px 0' }}>
                      Allowed to draft new SOP specifications.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {DEMO_USERS.map(user => (
                        <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', background: '#ffffff', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                          <input
                            type="checkbox"
                            checked={creators.includes(user.id)}
                            onChange={() => handleToggleUser(user.id, 'creators')}
                            style={{ accentColor: '#0284c7' }}
                          />
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{user.name}</span>
                          <span style={{ color: '#94a3b8', fontSize: 10 }}>({user.role})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 2. SOP Approvers */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                      SOP Approvers
                    </div>
                    <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 10px 0' }}>
                      Allowed to review & approve SOP drafts.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {DEMO_USERS.map(user => (
                        <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', background: '#ffffff', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                          <input
                            type="checkbox"
                            checked={approvers.includes(user.id)}
                            onChange={() => handleToggleUser(user.id, 'approvers')}
                            style={{ accentColor: '#0284c7' }}
                          />
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{user.name}</span>
                          <span style={{ color: '#94a3b8', fontSize: 10 }}>({user.role})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 3. Task Submitters */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                      Task Submitters (Makers)
                    </div>
                    <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 10px 0' }}>
                      Allowed to execute & submit tasks.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {DEMO_USERS.map(user => (
                        <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', background: '#ffffff', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                          <input
                            type="checkbox"
                            checked={makers.includes(user.id)}
                            onChange={() => handleToggleUser(user.id, 'makers')}
                            style={{ accentColor: '#0284c7' }}
                          />
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{user.name}</span>
                          <span style={{ color: '#94a3b8', fontSize: 10 }}>({user.role})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 4. Task Approvers */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, background: '#f8fafc' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                      Task Approvers (Checkers)
                    </div>
                    <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 10px 0' }}>
                      Allowed to verify & approve tasks.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {DEMO_USERS.map(user => (
                        <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', background: '#ffffff', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                          <input
                            type="checkbox"
                            checked={checkers.includes(user.id)}
                            onChange={() => handleToggleUser(user.id, 'checkers')}
                            style={{ accentColor: '#0284c7' }}
                          />
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{user.name}</span>
                          <span style={{ color: '#94a3b8', fontSize: 10 }}>({user.role})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => setActiveCategory(null)}
                    style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{ padding: '8px 18px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {saving ? 'Saving...' : 'Save Access Control'}
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
