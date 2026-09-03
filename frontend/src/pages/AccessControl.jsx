import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import UserPickerModal from '../components/UserPickerModal';
import Toast from '../components/Toast';
import {
  getProcessCategories,
  getCategoryAccessAssignments,
  saveCategoryAccessAssignments,
  getAccessControlActivityLogs,
  getUsers,
  MOCK_ORGANIZATION_USERS,
} from '../services/api';
import { getSession } from '../auth/auth';


export default function AccessControl() {
  const [allUsers, setAllUsers] = useState(MOCK_ORGANIZATION_USERS);
  const [categories, setCategories] = useState([]);
  const [categoryAssignments, setCategoryAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Category Modal State
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('CONFIGURE'); // 'CONFIGURE' | 'ACTIVITY'
  const [categoryLogs, setCategoryLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

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

  useEffect(() => {
    if (activeCategory && activeModalTab === 'ACTIVITY') {
      const code = activeCategory.categoryCode || activeCategory.categoryName;
      fetchCategoryLogs(code);
    }
  }, [activeCategory, activeModalTab]);

  async function loadAllData() {
    setLoading(true);
    setError(null);
    try {
      const [catList, userList] = await Promise.all([
        getProcessCategories().catch(() => []),
        getUsers().catch(() => MOCK_ORGANIZATION_USERS),
      ]);
      const list = Array.isArray(catList) ? catList : [];
      setCategories(list);
      if (Array.isArray(userList) && userList.length > 0) {
        setAllUsers(userList);
      }

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

  async function fetchCategoryLogs(code) {
    setLoadingLogs(true);
    try {
      const data = await getAccessControlActivityLogs(code);
      setCategoryLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  }

  function handleOpenConfigureModal(cat, initialTab = 'CONFIGURE') {
    const code = cat.categoryCode || cat.categoryName;
    setActiveCategory(cat);
    setActiveModalTab(initialTab);
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
    } catch (err) {
      console.error('Failed to save access control:', err);
      setError('Failed to save access control: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function getUserNames(userIds = []) {
    if (!userIds || userIds.length === 0) return 'None assigned';
    const names = userIds.map(id => allUsers.find(u => u.id === id || u.userId === id)?.name || allUsers.find(u => u.id === id || u.userId === id)?.fullName || id);
    return names.join(', ');
  }

  function renderUserListCell(userIds = [], roleTitle = '', categoryName = '') {
    if (!userIds || userIds.length === 0) {
      return <span style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>None assigned</span>;
    }

    const userObjects = userIds.map(id => allUsers.find(u => u.id === id || u.userId === id) || { id, name: id, fullName: id, role: 'USER' });
    const formattedNames = userObjects.map(u => u.name || u.fullName || u.id).join(', ');

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
            maxWidth: 130,
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
            justify: 'center',
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

  const viewUsersList = viewUsersModal.userIds.map(id => allUsers.find(u => u.id === id || u.userId === id) || { id, name: id, fullName: id, email: '—', role: 'USER' });

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-text-primary">
      <main className="ml-[248px] flex-1 min-w-0 bg-bg-base">
        {/* Standardized Master-Detail Header */}
        <div className="w-full bg-[#f8fafc] border-b border-[#cbd5e1] px-8 py-[18px] shadow-sm box-border">
          <div className="flex items-center justify-between gap-4 w-full max-w-full box-border">
            <div>
              <h2 className="text-[22px] font-bold text-[#1e293b]">Named Access Control Manager</h2>
              <p className="text-[13.5px] text-text-muted mt-1">
                Configure named user permissions for SOP creation, SOP approval, Task execution, and Task verification across process categories.
              </p>
            </div>
          </div>
        </div>

        {/* Page Content View */}
        <div className="p-6 md:px-8 w-full max-w-full box-border">
          {/* Filter Bar */}
          <div className="bg-bg-surface border border-[#e2e8f0] rounded-t-[10px] p-[16px_20px] flex items-center justify-between">
            <div className="flex-1 max-w-[380px]">
              <input
                type="text"
                placeholder="Search category name or code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-[#cbd5e1] rounded-[6px] text-[13px] bg-[#f8fafc] text-[#0f172a] outline-none transition-all duration-150 focus:border-[#2563eb] focus:bg-bg-surface focus:ring-3 focus:ring-[rgba(37,99,235,0.1)]"
              />
            </div>
          </div>

          {/* Categories Table View with Horizontal Scroll & Sticky Actions Column */}
          <div className="bg-bg-surface border border-[#e2e8f0] border-t-0 rounded-b-[10px] overflow-x-auto shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            {loading ? (
              <div className="p-10 text-center text-text-muted text-[13px]">
                Loading process categories and access permissions...
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-10 text-center text-text-muted text-[13px]">
                No process categories found. Please create process categories first.
              </div>
            ) : (
              <table className="w-full min-w-[900px] border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#475569] text-left text-[11px] uppercase tracking-[0.5px]">
                    <th className="px-4 py-3 w-[180px]">Process Category</th>
                    <th className="px-4 py-3">SOP Creators</th>
                    <th className="px-4 py-3">SOP Approvers</th>
                    <th className="px-4 py-3">Task Submitters</th>
                    <th className="px-4 py-3">Task Approvers</th>
                    <th className="px-4 py-3 text-right w-[160px] sticky right-0 bg-[#f8fafc] z-[2] shadow-[-4px_0_8px_rgba(0,0,0,0.04)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map(cat => {
                    const code = cat.categoryCode || cat.categoryName;
                    const assign = categoryAssignments[code] || {};

                    return (
                      <tr key={cat.id || code} className="border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]">
                        <td className="px-4 py-3.5 align-middle">
                          <div className="font-bold text-text-primary">{cat.categoryName}</div>
                          <div className="text-[11px] text-[#0284c7] font-mono mt-0.5">{code}</div>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          {renderUserListCell(assign.creatorUserIds, 'SOP Creators', cat.categoryName)}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          {renderUserListCell(assign.approverUserIds, 'SOP Approvers', cat.categoryName)}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          {renderUserListCell(assign.makerUserIds, 'Task Submitters', cat.categoryName)}
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          {renderUserListCell(assign.checkerUserIds, 'Task Approvers', cat.categoryName)}
                        </td>
                        <td className="px-4 py-3.5 text-right sticky right-0 bg-bg-surface z-[1] shadow-[-4px_0_8px_rgba(0,0,0,0.04)] align-middle">
                          <button
                            type="button"
                            onClick={() => handleOpenConfigureModal(cat, 'CONFIGURE')}
                            className="bg-[#f0f9ff] border border-[#bae6fd] text-[#0284c7] rounded-[6px] px-3 py-[6px] cursor-pointer text-[12px] font-bold whitespace-nowrap transition-colors duration-150 hover:bg-[#e0f2fe]"
                          >
                            Configure &amp; Details
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

        {/* Modal for Configuring Access Control & Viewing Category Activity Logs */}
        {activeCategory && (
          <div className="fixed inset-0 bg-[#091124]/65 backdrop-blur-sm flex items-center justify-center z-[999] p-6" onClick={() => setActiveCategory(null)}>
            <div className="bg-bg-surface rounded-[16px] w-full max-w-[640px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.1)] overflow-hidden animate-modal-slide-in" onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="p-[24px_28px] bg-gradient-to-br from-[#1d4ed8] to-[#2563eb] text-white flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <h3 className="text-[17px] font-bold text-white tracking-[-0.2px]">Category Access: {activeCategory.categoryName}</h3>
                  <div className="flex items-center gap-2">
                    <span className="bg-white/20 border border-white/30 text-white font-mono text-[11px] px-2 py-[2px] rounded-[4px]">{activeCategory.categoryCode}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="bg-white/15 border border-white/25 rounded-[8px] w-8 h-8 text-white cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-white/30"
                  onClick={() => setActiveCategory(null)}
                  title="Close modal"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Icon-Tabs Header Bar */}
              <div className="flex border-b border-[#e2e8f0] bg-[#f8fafc] px-6">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('CONFIGURE')}
                  className={`flex items-center gap-2 px-4 py-3 text-[13px] font-bold bg-transparent border-none cursor-pointer border-b-[2.5px] transition-colors duration-150 ${activeModalTab === 'CONFIGURE' ? 'text-[#0284c7] border-[#0284c7]' : 'text-[#64748b] border-transparent hover:text-[#0f172a]'
                    }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="21" x2="4" y2="14" />
                    <line x1="4" y1="10" x2="4" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12" y2="3" />
                    <line x1="20" y1="21" x2="20" y2="16" />
                    <line x1="20" y1="12" x2="20" y2="3" />
                    <line x1="1" y1="14" x2="7" y2="14" />
                    <line x1="9" y1="8" x2="15" y2="8" />
                    <line x1="17" y1="16" x2="23" y2="16" />
                  </svg>
                  Access Permissions
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalTab('ACTIVITY')}
                  className={`flex items-center gap-2 px-4 py-3 text-[13px] font-bold bg-transparent border-none cursor-pointer border-b-[2.5px] transition-colors duration-150 ${activeModalTab === 'ACTIVITY' ? 'text-[#0284c7] border-[#0284c7]' : 'text-[#64748b] border-transparent hover:text-[#0f172a]'
                    }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Access Activity Log
                </button>
              </div>

              {/* Body Content based on Active Tab */}
              <div className="p-7 max-h-[440px] overflow-y-auto [scrollbar-gutter:stable]">
                {activeModalTab === 'CONFIGURE' ? (
                  <>
                    {hasSoDWarning && (
                      <div className="bg-[#fffbe6] border border-[#ffe58f] p-[10px_14px] rounded-[8px] text-[12px] text-[#873800] mb-4">
                        <span className="font-bold">Notice: Segregation of Duties (SoD) Active. </span>
                        Users assigned both Creator and Approver rights in this category are automatically prohibited by the security engine from self-approving their own drafts.
                      </div>
                    )}

                    <form id="access-control-form" onSubmit={handleSaveAccess} className="flex flex-col gap-[18px]">

                      {/* Read-Only Process Category Field */}
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <span className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">Process Category (Read-Only)</span>
                        <input
                          type="text"
                          value={`${activeCategory.categoryName} (${activeCategory.categoryCode})`}
                          disabled
                          className="w-full px-3 py-[10px] border border-[#cbd5e1] rounded-[8px] text-[13px] bg-[#f1f5f9] text-[#475569] font-semibold outline-none cursor-not-allowed box-border"
                        />
                      </div>

                      {/* 1. SOP Creators Trigger Field */}
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <span className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">SOP Creators</span>
                        <div
                          onClick={() => handleOpenUserPicker('creators')}
                          className="flex items-center justify-between p-[10px_14px] border border-[#cbd5e1] rounded-[8px] bg-bg-surface cursor-pointer hover:border-[#94a3b8] transition-colors duration-150"
                        >
                          <div>
                            <div className={`text-[13px] font-semibold ${creators.length ? 'text-text-primary' : 'text-[#94a3b8]'}`}>
                              {getUserNames(creators)}
                            </div>
                            <div className="text-[11px] text-text-muted mt-0.5">
                              Allowed to draft new SOP specifications
                            </div>
                          </div>
                          <span className="bg-[#f1f5f9] border border-[#cbd5e1] text-[#0284c7] p-[4px_10px] rounded-[6px] text-[12px] font-bold">
                            {creators.length} Selected ✎
                          </span>
                        </div>
                      </div>

                      {/* 2. SOP Approvers Trigger Field */}
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <span className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">SOP Approvers</span>
                        <div
                          onClick={() => handleOpenUserPicker('approvers')}
                          className="flex items-center justify-between p-[10px_14px] border border-[#cbd5e1] rounded-[8px] bg-bg-surface cursor-pointer hover:border-[#94a3b8] transition-colors duration-150"
                        >
                          <div>
                            <div className={`text-[13px] font-semibold ${approvers.length ? 'text-text-primary' : 'text-[#94a3b8]'}`}>
                              {getUserNames(approvers)}
                            </div>
                            <div className="text-[11px] text-text-muted mt-0.5">
                              Allowed to review &amp; approve SOP drafts
                            </div>
                          </div>
                          <span className="bg-[#f1f5f9] border border-[#cbd5e1] text-[#0284c7] p-[4px_10px] rounded-[6px] text-[12px] font-bold">
                            {approvers.length} Selected ✎
                          </span>
                        </div>
                      </div>

                      {/* 3. Task Submitters (Makers) Trigger Field */}
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <span className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">Task Submitters (Makers)</span>
                        <div
                          onClick={() => handleOpenUserPicker('makers')}
                          className="flex items-center justify-between p-[10px_14px] border border-[#cbd5e1] rounded-[8px] bg-bg-surface cursor-pointer hover:border-[#94a3b8] transition-colors duration-150"
                        >
                          <div>
                            <div className={`text-[13px] font-semibold ${makers.length ? 'text-text-primary' : 'text-[#94a3b8]'}`}>
                              {getUserNames(makers)}
                            </div>
                            <div className="text-[11px] text-text-muted mt-0.5">
                              Allowed to execute &amp; submit compliance tasks
                            </div>
                          </div>
                          <span className="bg-[#f1f5f9] border border-[#cbd5e1] text-[#0284c7] p-[4px_10px] rounded-[6px] text-[12px] font-bold">
                            {makers.length} Selected ✎
                          </span>
                        </div>
                      </div>

                      {/* 4. Task Approvers (Checkers) Trigger Field */}
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <span className="text-[12px] font-semibold text-[#1e293b] uppercase tracking-[0.4px]">Task Approvers (Checkers)</span>
                        <div
                          onClick={() => handleOpenUserPicker('checkers')}
                          className="flex items-center justify-between p-[10px_14px] border border-[#cbd5e1] rounded-[8px] bg-bg-surface cursor-pointer hover:border-[#94a3b8] transition-colors duration-150"
                        >
                          <div>
                            <div className={`text-[13px] font-semibold ${checkers.length ? 'text-text-primary' : 'text-[#94a3b8]'}`}>
                              {getUserNames(checkers)}
                            </div>
                            <div className="text-[11px] text-text-muted mt-0.5">
                              Allowed to verify &amp; approve compliance tasks
                            </div>
                          </div>
                          <span className="bg-[#f1f5f9] border border-[#cbd5e1] text-[#0284c7] p-[4px_10px] rounded-[6px] text-[12px] font-bold">
                            {checkers.length} Selected ✎
                          </span>
                        </div>
                      </div>

                    </form>
                  </>
                ) : (
                  /* TAB 2: ACCESS CONTROL ACTIVITY LOG TIMELINE */
                  <div>
                    {loadingLogs ? (
                      <div className="p-10 text-center text-text-muted text-[13px]">
                        Loading category access audit history...
                      </div>
                    ) : categoryLogs.length === 0 ? (
                      <div className="p-10 text-center text-text-muted text-[13px]">
                        No access control modifications logged for this category yet.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {categoryLogs.map(log => (
                          <div
                            key={log.id}
                            className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] p-[12px_16px] flex flex-col gap-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold bg-[#e0f2fe] text-[#0369a1] px-2 py-[2px] rounded-[6px] uppercase">
                                {log.action || 'ACCESS_CONTROL_UPDATED'}
                              </span>
                              <span className="text-[11px] text-text-muted">
                                {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}
                              </span>
                            </div>

                            <div className="text-[13px] text-[#1e293b] leading-normal">
                              {log.details}
                            </div>

                            <div className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                              <span className="font-semibold text-[#475569]">Updated by:</span> {log.actorName || log.actorId}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-[18px_28px] border-t border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-5 py-[9px] rounded-[8px] border border-[#cbd5e1] bg-bg-surface text-[#475569] text-[13px] font-semibold cursor-pointer transition-all duration-150 hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                  onClick={() => setActiveCategory(null)}
                >
                  Close
                </button>
                {activeModalTab === 'CONFIGURE' && (
                  <button
                    type="submit"
                    form="access-control-form"
                    className="inline-flex items-center gap-1.5 px-[22px] py-[9px] rounded-[8px] border-none bg-[#2563eb] text-white text-[13px] font-semibold cursor-pointer shadow-[0_4px_12px_rgba(37,99,235,0.35)] transition-all duration-150 hover:bg-[#1d4ed8] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={saving}
                  >
                    {saving ? 'Saving Access...' : 'Save Access Control'}
                  </button>
                )}
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
          <div className="fixed inset-0 bg-[#091124]/65 backdrop-blur-sm flex items-center justify-center z-[999] p-6" onClick={() => setViewUsersModal(prev => ({ ...prev, isOpen: false }))}>
            <div className="bg-bg-surface rounded-[16px] w-full max-w-[520px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.1)] overflow-hidden animate-modal-slide-in" onClick={e => e.stopPropagation()}>

              <div className="p-[24px_28px] bg-gradient-to-br from-[#1d4ed8] to-[#2563eb] text-white flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <h3 className="text-[17px] font-bold text-white tracking-[-0.2px]">Assigned {viewUsersModal.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-white">{viewUsersModal.categoryName}</span>
                    <span className="bg-white/20 border border-white/30 text-white font-mono text-[11px] px-2 py-[2px] rounded-[4px]">{viewUsersList.length} Users</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="bg-white/15 border border-white/25 rounded-[8px] w-8 h-8 text-white cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-white/30"
                  onClick={() => setViewUsersModal(prev => ({ ...prev, isOpen: false }))}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="p-7 max-h-[380px] overflow-y-auto [scrollbar-gutter:stable]">
                <div className="flex flex-col gap-2.5">
                  {viewUsersList.map((u, idx) => {
                    const initials = u.name
                      ? u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                      : u.id.substring(0, 2).toUpperCase();

                    return (
                      <div
                        key={u.id || idx}
                        className="flex items-center justify-between p-[12px_16px] bg-[#f8fafc] rounded-[10px] border border-[#e2e8f0] gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-full bg-[#0284c7] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13.5px] font-semibold text-text-primary">{u.name}</div>
                            <div className="text-[11.5px] text-text-muted mt-0.5 truncate">{u.email}</div>
                          </div>
                        </div>

                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-[6px] shrink-0 uppercase ${u.role === 'ADMIN' ? 'bg-[#fee2e2] text-[#b91c1c]' : 'bg-[#e0f2fe] text-[#0369a1]'
                          }`}>
                          {u.role || 'NON_ADMIN'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-[18px_28px] border-t border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-end">
                <button
                  type="button"
                  className="px-5 py-[9px] rounded-[8px] border border-[#cbd5e1] bg-bg-surface text-[#475569] text-[13px] font-semibold cursor-pointer transition-all duration-150 hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                  onClick={() => setViewUsersModal(prev => ({ ...prev, isOpen: false }))}
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

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
