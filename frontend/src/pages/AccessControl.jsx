import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import UserPickerModal from '../components/UserPickerModal';
import { getProcessCategories, getCategoryAccessAssignments, saveCategoryAccessAssignments } from '../services/api';
import { getSession } from '../auth/auth';
import styles from './AuditLogs.module.css';
import modalStyles from '../components/SopDetailModal.module.css';

const DEMO_USERS = [
  { id: 'usr-tushar-304', name: 'Tushar Seth', email: 'tushar@cloudkaptan.com', role: 'ADMIN' },
  { id: 'usr-vivek-108', name: 'Vivek Raj', email: 'vivek@cloudkaptan.com', role: 'NON_ADMIN' },
  { id: 'usr-mainak-215', name: 'Mainak Gupta', email: 'mainak@cloudkaptan.com', role: 'NON_ADMIN' },
  { id: 'usr-prayas-412', name: 'Prayasa Sharma', email: 'prayas@cloudkaptan.com', role: 'NON_ADMIN' },
  { id: 'usr-manoj-042', name: 'Manoj Kumar', email: 'manoj@cloudkaptan.com', role: 'NON_ADMIN' },
  { id: 'usr-avisek-499', name: 'Avisek Paul', email: 'avisek@cloudkaptan.com', role: 'NON_ADMIN' },
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

  // User Picker Modal State
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [pickerConfig, setPickerConfig] = useState({
    type: 'creators', // 'creators' | 'approvers' | 'makers' | 'checkers'
    title: 'Select Users',
    selectedIds: [],
  });

  // View Full Assigned Users Modal State
  const [viewUsersModal, setViewUsersModal] = useState({
    isOpen: false,
    title: '',
    categoryName: '',
    userIds: [],
  });

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

  function handleOpenUserPicker(type) {
    const typeConfig = {
      creators: { title: `Select SOP Creators for ${activeCategory?.categoryName}`, selectedIds: creators },
      approvers: { title: `Select SOP Approvers for ${activeCategory?.categoryName}`, selectedIds: approvers },
      makers: { title: `Select Task Submitters (Makers) for ${activeCategory?.categoryName}`, selectedIds: makers },
      checkers: { title: `Select Task Approvers (Checkers) for ${activeCategory?.categoryName}`, selectedIds: checkers },
    }[type];

    setPickerConfig({
      type,
      title: typeConfig.title,
      selectedIds: typeConfig.selectedIds,
    });
    setPickerModalOpen(true);
  }

  function handleConfirmUserPicker(selectedIds) {
    if (pickerConfig.type === 'creators') setCreators(selectedIds);
    if (pickerConfig.type === 'approvers') setApprovers(selectedIds);
    if (pickerConfig.type === 'makers') setMakers(selectedIds);
    if (pickerConfig.type === 'checkers') setCheckers(selectedIds);
    setPickerModalOpen(false);
  }

  function handleOpenViewUsers(title, categoryName, userIds) {
    setViewUsersModal({
      isOpen: true,
      title,
      categoryName,
      userIds: userIds || [],
    });
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
    return names.join(', ');
  }

  function renderUserListCell(userIds = [], roleTitle = '', categoryName = '') {
    if (!userIds || userIds.length === 0) {
      return <span style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>None assigned</span>;
    }

    const userObjects = userIds.map(id => DEMO_USERS.find(u => u.id === id) || { id, name: id, role: 'USER' });
    const formattedNames = userObjects.map(u => u.name).join(', ');

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', minWidth: 0 }}>
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 12.5,
            fontWeight: 500,
            color: '#1e293b',
            display: 'inline-block',
            maxWidth: 160,
          }}
          title={formattedNames}
        >
          {formattedNames}
        </span>

        <button
          type="button"
          onClick={() => handleOpenViewUsers(roleTitle, categoryName, userIds)}
          title={`View full list of assigned ${roleTitle}`}
          style={{
            background: 'none',
            border: 'none',
            color: '#0284c7',
            cursor: 'pointer',
            padding: 2,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            flexShrink: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
      </div>
    );
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

  const viewUsersList = viewUsersModal.userIds.map(id => DEMO_USERS.find(u => u.id === id) || { id, name: id, email: '—', role: 'USER' });

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
                No process categories found. Please create process categories first.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '12px 16px', width: 200 }}>Process Category</th>
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
                        <td style={{ padding: '14px 16px' }}>
                          {renderUserListCell(assign.creatorUserIds, 'SOP Creators', cat.categoryName)}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {renderUserListCell(assign.approverUserIds, 'SOP Approvers', cat.categoryName)}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {renderUserListCell(assign.makerUserIds, 'Task Submitters', cat.categoryName)}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {renderUserListCell(assign.checkerUserIds, 'Task Approvers', cat.categoryName)}
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
          <div className={modalStyles.backdrop} onClick={() => setActiveCategory(null)}>
            <div className={modalStyles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
              
              {/* Header */}
              <div className={modalStyles.header}>
                <div className={modalStyles.titleArea}>
                  <h3>Configure Category Access</h3>
                  <div className={modalStyles.badges}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{activeCategory.categoryName}</span>
                    <span className={modalStyles.codeBadge}>{activeCategory.categoryCode}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className={modalStyles.closeBtn}
                  onClick={() => setActiveCategory(null)}
                  title="Close modal"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Body Form */}
              <div className={modalStyles.body}>
                {hasSoDWarning && (
                  <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', padding: '10px 14px', borderRadius: 8, fontSize: 12, color: '#873800' }}>
                    <span style={{ fontWeight: 700 }}>Notice: Segregation of Duties (SoD) Active. </span>
                    Users assigned both Creator and Approver rights in this category are automatically prohibited by the security engine from self-approving their own drafts.
                  </div>
                )}

                <form id="access-control-form" onSubmit={handleSaveAccess} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  
                  {/* Read-Only Process Category Field */}
                  <div className={modalStyles.field}>
                    <span className={modalStyles.label}>Process Category (Read-Only)</span>
                    <input
                      type="text"
                      value={`${activeCategory.categoryName} (${activeCategory.categoryCode})`}
                      disabled
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, background: '#f1f5f9', color: '#475569', fontWeight: 600, boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* 1. SOP Creators Trigger Field */}
                  <div className={modalStyles.field}>
                    <span className={modalStyles.label}>SOP Creators</span>
                    <div
                      onClick={() => handleOpenUserPicker('creators')}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#ffffff', cursor: 'pointer' }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: creators.length ? '#0f172a' : '#94a3b8' }}>
                          {getUserNames(creators)}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          Allowed to draft new SOP specifications
                        </div>
                      </div>
                      <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0284c7', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                        {creators.length} Selected ✎
                      </span>
                    </div>
                  </div>

                  {/* 2. SOP Approvers Trigger Field */}
                  <div className={modalStyles.field}>
                    <span className={modalStyles.label}>SOP Approvers</span>
                    <div
                      onClick={() => handleOpenUserPicker('approvers')}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#ffffff', cursor: 'pointer' }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: approvers.length ? '#0f172a' : '#94a3b8' }}>
                          {getUserNames(approvers)}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          Allowed to review & approve SOP drafts
                        </div>
                      </div>
                      <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0284c7', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                        {approvers.length} Selected ✎
                      </span>
                    </div>
                  </div>

                  {/* 3. Task Submitters (Makers) Trigger Field */}
                  <div className={modalStyles.field}>
                    <span className={modalStyles.label}>Task Submitters (Makers)</span>
                    <div
                      onClick={() => handleOpenUserPicker('makers')}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#ffffff', cursor: 'pointer' }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: makers.length ? '#0f172a' : '#94a3b8' }}>
                          {getUserNames(makers)}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          Allowed to execute & submit compliance tasks
                        </div>
                      </div>
                      <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0284c7', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                        {makers.length} Selected ✎
                      </span>
                    </div>
                  </div>

                  {/* 4. Task Approvers (Checkers) Trigger Field */}
                  <div className={modalStyles.field}>
                    <span className={modalStyles.label}>Task Approvers (Checkers)</span>
                    <div
                      onClick={() => handleOpenUserPicker('checkers')}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#ffffff', cursor: 'pointer' }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: checkers.length ? '#0f172a' : '#94a3b8' }}>
                          {getUserNames(checkers)}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                          Allowed to verify & approve compliance tasks
                        </div>
                      </div>
                      <span style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0284c7', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                        {checkers.length} Selected ✎
                      </span>
                    </div>
                  </div>

                </form>
              </div>

              {/* Footer */}
              <div className={modalStyles.footer}>
                <button
                  type="button"
                  className={modalStyles.btnSecondary}
                  onClick={() => setActiveCategory(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="access-control-form"
                  className={modalStyles.btnPrimary}
                  disabled={saving}
                >
                  {saving ? 'Saving Access...' : 'Save Access Control'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* UserPickerModal MultiSelect Modal */}
        <UserPickerModal
          isOpen={pickerModalOpen}
          title={pickerConfig.title}
          selectedUserIds={pickerConfig.selectedIds}
          onClose={() => setPickerModalOpen(false)}
          onConfirm={handleConfirmUserPicker}
        />

        {/* Full Assigned Users List View Modal */}
        {viewUsersModal.isOpen && (
          <div className={modalStyles.backdrop} onClick={() => setViewUsersModal(prev => ({ ...prev, isOpen: false }))}>
            <div className={modalStyles.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
              
              <div className={modalStyles.header}>
                <div className={modalStyles.titleArea}>
                  <h3>Assigned {viewUsersModal.title}</h3>
                  <div className={modalStyles.badges}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{viewUsersModal.categoryName}</span>
                    <span className={modalStyles.codeBadge}>{viewUsersList.length} Users</span>
                  </div>
                </div>
                <button
                  type="button"
                  className={modalStyles.closeBtn}
                  onClick={() => setViewUsersModal(prev => ({ ...prev, isOpen: false }))}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className={modalStyles.body} style={{ maxHeight: 380, overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {viewUsersList.map((u, idx) => {
                    const initials = u.name
                      ? u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                      : u.id.substring(0, 2).toUpperCase();

                    return (
                      <div
                        key={u.id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'space-between',
                          padding: '10px 14px',
                          background: '#f8fafc',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#0284c7', color: '#ffffff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{u.email}</div>
                          </div>
                        </div>

                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: u.role === 'ADMIN' ? '#fee2e2' : '#e0f2fe', color: u.role === 'ADMIN' ? '#b91c1c' : '#0369a1' }}>
                          {u.role || 'NON_ADMIN'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={modalStyles.footer}>
                <button
                  type="button"
                  className={modalStyles.btnSecondary}
                  onClick={() => setViewUsersModal(prev => ({ ...prev, isOpen: false }))}
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
