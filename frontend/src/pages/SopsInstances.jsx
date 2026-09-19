import { useState, useEffect } from 'react';
import CustomSelect from '../components/CustomSelect';
import TableSkeleton from '../components/TableSkeleton';
import Pagination from '../components/Pagination';
import SopDetailModal from '../components/SopDetailModal';
import AssignedSopDetailsModal from '../components/AssignedSopDetailsModal';
import AssignSOPModal from '../components/AssignSOPModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SopActivityLogModal from '../components/SopActivityLogModal';
import Toast from '../components/Toast';
import { getSession } from '../auth/auth';
import { getSops, getSopTemplates, deleteSop, getUsers, actionSop, activateSopTemplate, rejectSopTemplate, getProcessCategories, getUserCreatableCategories, getUserAccessibleCategories, getUsersByPermission } from '../services/api';
import { useEntity } from '../context/EntityContext';

import { z } from 'zod';



const FREQ_LABEL = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUAL: 'Annual',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
};

function isSopCreator(sop, userId) {
  if (!sop || !userId) return false;
  if (Array.isArray(sop.assignedCreatorIds) && sop.assignedCreatorIds.length > 0) {
    return sop.assignedCreatorIds.includes(userId);
  }
  return sop.assignedCreatorId === userId;
}

function isSopApprover(sop, userId) {
  if (!sop || !userId) return false;
  if (Array.isArray(sop.assignedApproverIds) && sop.assignedApproverIds.length > 0) {
    return sop.assignedApproverIds.includes(userId);
  }
  return sop.assignedApproverId === userId;
}


const USER_ID_MAP = {
  'Tushar Seth': 'usr-tushar-304',
  'Prayasa Sharma': 'usr-prayasa-410',
  'Vivek Raj': 'usr-vivek-108',
  'Mainak Gupta': 'usr-mainak-215',
  'Manoj Agarwal': 'usr-manoj-042',
  'usr-tushar': 'usr-tushar-304',
  'usr-prayasa': 'usr-prayasa-410',
  'usr-vivek': 'usr-vivek-108',
  'usr-mainak': 'usr-mainak-215',
  'usr-manoj': 'usr-manoj-042',
};

const INITIAL_FORM = {
  sopCode: '',
  title: '',
  description: '',
  processCategory: '',
  entityCode: '',
  frequency: 'MONTHLY',
  startDateTime: new Date().toISOString().slice(0, 16),
  dueDateTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  dueDayOffset: 15,
  isRecurring: false,
  defaultMakerIds: [],
  defaultCheckerIds: [],
};

const PAGE_SIZE = 10;

const PROCESS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Processes' },
];

const FREQUENCY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Frequencies' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'DAILY', label: 'Daily' },
];

const MAKER_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Makers' },
  { value: 'Tushar Seth', label: 'Tushar Seth' },
  { value: 'Vivek Raj', label: 'Vivek Raj' },
  { value: 'Prayasa Sharma', label: 'Prayasa Sharma' },
  { value: 'Manoj Agarwal', label: 'Manoj Agarwal' },
];

const CHECKER_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Checkers' },
  { value: 'Mainak Gupta', label: 'Mainak Gupta' },
  { value: 'Vivek Raj', label: 'Vivek Raj' },
  { value: 'Manoj Agarwal', label: 'Manoj Agarwal' },
];

const CREATOR_FILTER_OPTIONS = [{ value: 'ALL', label: 'All Makers' }];
const APPROVER_FILTER_OPTIONS = [{ value: 'ALL', label: 'All Checkers' }];

const ADMIN_STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
];

const USER_STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
];

export default function SopInstances() {
  const [sopList, setSopList] = useState([]);
  const [userMap, setUserMap] = useState(USER_ID_MAP);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);



  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProcess, setSelectedProcess] = useState('ALL');
  const [selectedFrequency, setSelectedFrequency] = useState('ALL');
  const [selectedMaker, setSelectedMaker] = useState('ALL');
  const [selectedChecker, setSelectedChecker] = useState('ALL');
  const [selectedCreator, setSelectedCreator] = useState('ALL');
  const [selectedApprover, setSelectedApprover] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modal States
  const [dynamicProcessOptions, setDynamicProcessOptions] = useState(PROCESS_FILTER_OPTIONS);
  const [dynamicCreatorFilterOptions, setDynamicCreatorFilterOptions] = useState(CREATOR_FILTER_OPTIONS);
  const [dynamicApproverFilterOptions, setDynamicApproverFilterOptions] = useState(APPROVER_FILTER_OPTIONS);

  const [creatableCategories, setCreatableCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSop, setEditingSop] = useState(null);
  const [lockedAssignment, setLockedAssignment] = useState(null); // sidebar notification click
  const [viewingSop, setViewingSop] = useState(null);
  const [viewingAssignment, setViewingAssignment] = useState(null);
  const [viewingSopHistory, setViewingSopHistory] = useState(null);
  const [deletingSop, setDeletingSop] = useState(null);
  const [targetCategory, setTargetCategory] = useState(null);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showCreateCompleteModal, setShowCreateCompleteModal] = useState(false);

  const [runningScheduler, setRunningScheduler] = useState(false);
  // Admin Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    sopCode: '',
    entityCode: '',
    processCategory: '',
    assignedCreatorId: '',
    assignedApproverId: '',
  });

  // Rejection Modal State
  const [rejectingSop, setRejectingSop] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');


  const session = getSession();
  const currentUser = session?.user;
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email?.includes('mainak');
  const { selectedEntities } = useEntity();


  // Handler for sidebar SOP task notification card click


  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm ? searchTerm.trim() : '');
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSops({
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        entities: Array.isArray(selectedEntities) ? selectedEntities : (selectedEntities ? [selectedEntities] : []),
        category: selectedProcess !== 'ALL' ? selectedProcess : undefined,
        frequency: selectedFrequency !== 'ALL' ? selectedFrequency : undefined,
        search: debouncedSearchTerm || undefined,
        page: currentPage > 0 ? currentPage - 1 : 0,
        size: PAGE_SIZE ?? 10,
      });
      const list = res?.data || [];
      setTotalItems(res?.totalElements ?? list.length);
      setSopList(list);

      const targetUid = currentUser?.id || currentUser?.userId || currentUser?.email;
      if (isAdmin) {
        const categoriesData = await getProcessCategories().catch(() => []);
        if (Array.isArray(categoriesData) && categoriesData.length > 0) {
          const opts = [
            { value: 'ALL', label: 'All Processes' },
            ...categoriesData.map(c => ({ value: c.categoryCode, label: c.categoryName }))
          ];
          setDynamicProcessOptions(opts);
        }
      } else if (targetUid) {
        const userCategories = await getUserAccessibleCategories(targetUid).catch(() => []);
        if (Array.isArray(userCategories) && userCategories.length > 0) {
          const opts = [
            { value: 'ALL', label: 'All Processes' },
            ...userCategories.map(c => ({ value: typeof c === 'string' ? c : (c.categoryCode || c.categoryName), label: typeof c === 'string' ? c : (c.categoryName || c.categoryCode) }))
          ];
          setDynamicProcessOptions(opts);
        } else {
          setDynamicProcessOptions([{ value: 'ALL', label: 'All Processes' }]);
        }
      }

      if (targetUid) {
        const creatable = await getUserCreatableCategories(targetUid).catch(() => []);
        setCreatableCategories(Array.isArray(creatable) ? [...creatable] : []);
      }
    } catch (error) {
      console.error("Failed to fetch SOP instances:", error);
      setErrorMsg(error?.message || error || "Failed to fetch SOP instance data");
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedEntities, selectedProcess, selectedFrequency, debouncedSearchTerm, currentPage, currentUser, isAdmin]);

  useEffect(() => {
    if (!selectedEntities) return;
    loadData();
  }, [selectedEntities, selectedFrequency, selectedProcess, selectedStatus, debouncedSearchTerm, currentPage, loadData]);


  function openCreateModal(targetCat) {
    const canCreate = isAdmin || (Array.isArray(creatableCategories) && creatableCategories.length > 0);
    if (!canCreate) {
      setSuccessMsg('');
      setErrorMsg('Access Denied: You do not have permission to create SOPs for any process category. Please ask an Admin to grant SOP Creator access.');
      return;
    }
    const catString = (typeof targetCat === 'string' && targetCat.trim()) ? targetCat.trim() : null;
    setEditingSop(null);
    setLockedAssignment(null);
    setTargetCategory(catString);
    const initialCategory = catString
      || ((creatableCategories && creatableCategories.length > 0) ? creatableCategories[0] : '');
    setFormData({
      ...INITIAL_FORM,
      processCategory: initialCategory
    });
    setErrorMsg('');
    setShowModal(true);
  }

  function openEditModal(sop) {
    const isAllowed = isAdmin || currentUser?.role === 'ADMIN' || isSopCreator(sop, currentUser?.id);
    if (!isAllowed) {
      setSuccessMsg('');
      setErrorMsg('Access Denied: Only assigned creators or Admin users have permission to edit this SOP.');
      return;
    }
    setEditingSop(sop);

    let rawMakers = sop.defaultMakerIds || (sop.defaultMakerNames ? sop.defaultMakerNames.map(n => USER_ID_MAP[n] || n) : (sop.defaultMakerId ? [sop.defaultMakerId] : []));
    let rawCheckers = sop.defaultCheckerIds || (sop.defaultCheckerNames ? sop.defaultCheckerNames.map(n => USER_ID_MAP[n] || n) : (sop.defaultCheckerId ? [sop.defaultCheckerId] : []));

    const makers = Array.from(new Set(rawMakers.map(id => USER_ID_MAP[id] || id)));
    const checkers = Array.from(new Set(rawCheckers.map(id => USER_ID_MAP[id] || id)));

    setFormData({
      sopCode: sop.code || sop.sopCode || '',
      title: sop.name || sop.title || '',
      description: sop.description || '',
      processCategory: sop.process || sop.processCategory || '',
      entityCode: sop.entityCode || '',
      frequency: sop.frequency || 'MONTHLY',
      dueDayOffset: sop.dueDay || sop.dueDayOffset || 15,
      isRecurring: sop.isRecurring !== undefined ? !!sop.isRecurring : false,
      defaultMakerIds: makers,
      defaultCheckerIds: checkers,
    });
    setErrorMsg('');
    setShowModal(true);
  }


  async function handleApproveSop(sop) {
    try {
      setSaving(true);
      if (sop.isTemplate || sop.templateId) {
        await activateSopTemplate(sop.templateId || sop.id, currentUser?.id || 'usr-vivek-108');
      } else {
        await actionSop(sop.id || sop.sopId, { action: 'APPROVE', actorId: currentUser?.id || 'usr-vivek-108' });
      }
      window.dispatchEvent(new Event('sop-updated'));
      setSuccessMsg(`SOP "${sop.name || sop.title || sop.code}" approved successfully! Status is now ACTIVE for compliance task generation.`);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to approve SOP');
    } finally {
      setSaving(false);
    }
  }


  async function confirmDeleteSop() {
    if (!deletingSop) return;
    try {
      setDeleting(true);
      await deleteSop(deletingSop.sopId || deletingSop.id || deletingSop.code);
      setSuccessMsg(`SOP "${deletingSop.name || deletingSop.title}" deleted successfully!`);
      setDeletingSop(null);
      await loadData();
    } catch (err) {
      setErrorMsg('Failed to delete SOP.');
    } finally {
      setDeleting(false);
    }
  }

  function getNamesForIds(ids = []) {
    if (!ids.length) return 'None assigned';
    return ids.map(id => userMap[id] || id).join(', ');
  }

  function resetFilters() {
    setSearchTerm('');
    setSelectedProcess('ALL');
    setSelectedFrequency('ALL');
    setSelectedMaker('ALL');
    setSelectedChecker('ALL');
    setSelectedCreator('ALL');
    setSelectedApprover('ALL');
    setSelectedStatus('ALL');
    setCurrentPage(1);
  }



  // useEffect to change the filter list of creators and approvers based on process category filter

  useEffect(() => {

    if (!selectedEntities) return;

    loadData();

    function handleDraftEvent(e) {
      if (e.detail) {
        setLockedAssignment(e.detail);
        setEditingSop(null);
        setShowModal(true);
      }
    }

    function handleReviewEvent(e) {
      if (e.detail) {
        setViewingSop(e.detail);
      }
    }

    function handleViewEvent(e) {
      if (e.detail) {
        setViewingSop(e.detail);
      }
    }

    function handleUpdateEvent() {
      loadData();
    }

    function handleCreateSopEvent(e) {
      const cat = e?.detail?.category;
      openCreateModal(cat);
    }

    window.addEventListener('open-create-sop', handleCreateSopEvent);
    window.addEventListener('open-sop-draft', handleDraftEvent);
    window.addEventListener('open-sop-review', handleReviewEvent);
    window.addEventListener('open-sop-view', handleViewEvent);
    window.addEventListener('sop-updated', handleUpdateEvent);

    // Check for draftSopCode, reviewSopCode, viewSopCode, action=createSop or sopId query params
    const params = new URLSearchParams(window.location.search);
    const draftCode = params.get('draftSopCode');
    const reviewCode = params.get('reviewSopCode');
    const viewCode = params.get('viewSopCode') || params.get('sopId') || params.get('sopCode');
    const actionParam = params.get('action');
    const categoryParam = params.get('category');

    if (actionParam === 'createSop') {
      openCreateModal(categoryParam);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (draftCode) {
      getSops({}).then(result => {
        const all = result?.data || [];
        const target = all.find(s => (s.code === draftCode || s.sopCode === draftCode || s.id === draftCode || s.sopId === draftCode));
        if (target) {
          setLockedAssignment(target);
          setEditingSop(null);
          setShowModal(true);
        }
      });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (reviewCode) {
      getSops({}).then(result => {
        const all = result?.data || [];
        const target = all.find(s => (s.code === reviewCode || s.sopCode === reviewCode || s.id === reviewCode || s.sopId === reviewCode));
        if (target) {
          setViewingSop(target);
        }
      });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (viewCode) {
      getSops({}).then(result => {
        const all = result?.data || [];
        const target = all.find(s => (s.code === viewCode || s.sopCode === viewCode || s.id === viewCode || s.sopId === viewCode));
        if (target) {
          if (target.status === 'PENDING_CREATION' || target.status === 'REJECTED') {
            setLockedAssignment(target);
            setShowModal(true);
          } else {
            setViewingSop(target);
          }
        }
      });
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('open-create-sop', handleCreateSopEvent);
      window.removeEventListener('open-sop-draft', handleDraftEvent);
      window.removeEventListener('open-sop-review', handleReviewEvent);
      window.removeEventListener('open-sop-view', handleViewEvent);
      window.removeEventListener('sop-updated', handleUpdateEvent);
    };
  }, [selectedEntities]);

  useEffect(() => {

    if (selectedProcess && selectedProcess !== 'ALL') {
      try {
        const [creators, approvers] = Promise.all([
          getUsersByPermission(selectedProcess, 'CREATOR'),
          getUsersByPermission(selectedProcess, 'APPROVER')
        ])
        const crList = Array.isArray(creators) ? creators : [];
        const aList = Array.isArray(approvers) ? approvers : [];

        setDynamicCreatorFilterOptions([
          { value: 'ALL', label: 'All Makers' },
          ...crList.map(u => ({ value: u.id, label: u.name || u.id }))
        ]);
        setDynamicApproverFilterOptions([
          { value: 'ALL', label: 'All Checkers' },
          ...aList.map(u => ({ value: u.id, label: u.name || u.id }))
        ]);
      } catch {
        setDynamicCreatorFilterOptions([{ value: 'ALL', label: 'All Creators' }]);
        setDynamicApproverFilterOptions([{ value: 'ALL', label: 'All Checkers' }]);
      };
    } else {
      getUsers().then(res => {
        const users = Array.isArray(res) ? res : (res?.data || []);
        if (users.length > 0) {
          setDynamicCreatorFilterOptions([
            { value: 'ALL', label: 'All Makers' },
            ...users.map(u => ({ value: u.id || u.userId, label: u.name || u.fullName }))
          ]);
          setDynamicApproverFilterOptions([
            { value: 'ALL', label: 'All Checkers' },
            ...users.map(u => ({ value: u.id || u.userId, label: u.name || u.fullName }))
          ]);
        }
      }).catch(() => { });
    }
  }, [selectedProcess]);

  // 1. Function to fetch and map users dynamically
  async function initializeUserMap() {
    try {
      const res = await getUsers();
      const usersList = Array.isArray(res) ? res : (res?.data || []);

      if (usersList.length > 0) {
        // Start with your existing hardcoded map as a fallback
        const dynamicUserMap = { ...USER_ID_MAP };

        usersList.forEach(user => {
          const userId = user.id || user.userId;
          const userName = user.name || user.fullName;

          if (userId && userName) {
            // Map ID -> Name (Useful for rendering names in the UI based on IDs)
            dynamicUserMap[userId] = userName;

            // Map Name -> ID (Useful for resolving IDs when saving forms)
            dynamicUserMap[userName] = userId;
          }
        });

        setUserMap(dynamicUserMap);
      }
    } catch (error) {
      console.error("Failed to fetch users for userMap:", error);
    }
  }

  // 2. Call it exactly once on the first render
  useEffect(() => {
    initializeUserMap();
  }, []);




  const isFiltered = searchTerm.trim() !== '' ||
    selectedProcess !== 'ALL' ||
    selectedFrequency !== 'ALL' ||
    selectedMaker !== 'ALL' ||
    selectedChecker !== 'ALL' ||
    selectedCreator !== 'ALL' ||
    selectedApprover !== 'ALL' ||
    selectedStatus !== 'ALL';

  const filtered = sopList.filter(s => {
    if (!selectedEntities.includes(s.entityCode)) return false;

    // Non-admin users: hide raw PENDING_CREATION stubs unless assigned to currentUser
    if (!isAdmin && s.status === 'PENDING_CREATION' && !isSopCreator(s, currentUser?.id)) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const codeMatch = s.code?.toLowerCase().includes(q);
      const nameMatch = (s.name || s.title)?.toLowerCase().includes(q);
      const processMatch = (s.process || s.processCategory)?.toLowerCase().includes(q);
      const makerMatch = (s.makers?.join(', ') || s.maker)?.toLowerCase().includes(q);
      const checkerMatch = (s.checkers?.join(', ') || s.checker)?.toLowerCase().includes(q);
      const creatorMatch = (s.assignedCreatorName || s.assignedCreatorId)?.toLowerCase().includes(q);
      const approverMatch = (s.assignedApproverName || s.assignedApproverId)?.toLowerCase().includes(q);
      if (!codeMatch && !nameMatch && !processMatch && !makerMatch && !checkerMatch && !creatorMatch && !approverMatch) return false;
    }

    if (selectedProcess !== 'ALL') {
      const proc = s.process || s.processCategory;
      if (proc !== selectedProcess) return false;
    }

    if (selectedStatus !== 'ALL') {
      if (s.status !== selectedStatus) return false;
    }

    if (isAdmin) {
      if (selectedCreator !== 'ALL') {
        const creator = s.assignedCreatorId || s.assignedCreatorName || '';
        if (!creator.toLowerCase().includes(selectedCreator.toLowerCase())) return false;
      }

      if (selectedApprover !== 'ALL') {
        const approver = s.assignedApproverId || s.assignedApproverName || '';
        if (!approver.toLowerCase().includes(selectedApprover.toLowerCase())) return false;
      }
    } else {
      if (selectedFrequency !== 'ALL') {
        if (s.frequency !== selectedFrequency) return false;
      }

      if (selectedMaker !== 'ALL') {
        const makerStr = s.makers?.length ? s.makers.join(', ') : (s.maker || '');
        if (!makerStr.toLowerCase().includes(selectedMaker.toLowerCase())) return false;
      }

      if (selectedChecker !== 'ALL') {
        const checkerStr = s.checkers?.length ? s.checkers.join(', ') : (s.checker || '');
        if (!checkerStr.toLowerCase().includes(selectedChecker.toLowerCase())) return false;
      }
    }

    return true;
  });

  const paginatedSops = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <div className="p-6 md:px-8 w-full max-w-full box-border">

        <Toast message={successMsg} type="success" onClose={() => setSuccessMsg('')} />

        {/* SOP Filter Toolbar */}
        <div className="relative z-10 flex flex-wrap items-end gap-3 mb-6 bg-bg-surface p-[16px_20px] rounded-[12px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.04)] w-full box-border overflow-visible">
          <div className="relative flex flex-col gap-1.5 flex-[1.5] min-w-[220px]">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Search SOP</span>
            <div className="relative flex items-center w-full">
              <svg className="absolute left-3 text-[#94a3b8] pointer-events-none" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="w-full h-[40px] pl-[38px] pr-[14px] bg-bg-surface border border-[#cbd5e1] rounded-[8px] text-[13.5px] text-text-primary outline-none transition-all duration-150 box-border focus:border-[#2563eb] focus:ring-3 focus:ring-[rgba(37,99,235,0.1)]"
                placeholder="Search code, title, process..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div className="relative flex flex-col gap-1.5 flex-1 min-w-[135px]">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Process Category</span>
            <CustomSelect
              name="selectedProcess"
              value={selectedProcess}
              options={dynamicProcessOptions}
              onChange={e => {
                setSelectedProcess(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {isAdmin ? (
            <>
              {/* <div className="relative flex flex-col gap-1.5 flex-1 min-w-[135px]">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Maker</span>
                <CustomSelect
                  name="selectedCreator"
                  value={selectedCreator}
                  options={dynamicCreatorFilterOptions}
                  onChange={e => {
                    setSelectedCreator(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="relative flex flex-col gap-1.5 flex-1 min-w-[135px]">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Checker</span>
                <CustomSelect
                  name="selectedApprover"
                  value={selectedApprover}
                  options={dynamicApproverFilterOptions}
                  onChange={e => {
                    setSelectedApprover(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div> */}

              <div className="relative flex flex-col gap-1.5 flex-1 min-w-[135px]">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Status</span>
                <CustomSelect
                  name="selectedStatus"
                  value={selectedStatus}
                  options={ADMIN_STATUS_FILTER_OPTIONS}
                  onChange={e => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="relative flex flex-col gap-1.5 flex-1 min-w-[135px]">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Frequency</span>
                <CustomSelect
                  name="selectedFrequency"
                  value={selectedFrequency}
                  options={FREQUENCY_FILTER_OPTIONS}
                  onChange={e => {
                    setSelectedFrequency(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="relative flex flex-col gap-1.5 flex-1 min-w-[135px]">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Frequency</span>
                <CustomSelect
                  name="selectedFrequency"
                  value={selectedFrequency}
                  options={FREQUENCY_FILTER_OPTIONS}
                  onChange={e => {
                    setSelectedFrequency(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="relative flex flex-col gap-1.5 flex-1 min-w-[135px]">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Maker</span>
                <CustomSelect
                  name="selectedMaker"
                  value={selectedMaker}
                  options={MAKER_FILTER_OPTIONS}
                  onChange={e => {
                    setSelectedMaker(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="relative flex flex-col gap-1.5 flex-1 min-w-[135px]">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Checker</span>
                <CustomSelect
                  name="selectedChecker"
                  value={selectedChecker}
                  options={CHECKER_FILTER_OPTIONS}
                  onChange={e => {
                    setSelectedChecker(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="relative flex flex-col gap-1.5 flex-1 min-w-[135px]">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Status</span>
                <CustomSelect
                  name="selectedStatus"
                  value={selectedStatus}
                  options={USER_STATUS_FILTER_OPTIONS}
                  onChange={e => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </>
          )}

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

        <div className="bg-bg-surface border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between px-6 py-[18px] bg-bg-surface border-b border-[#f1f5f9]">
            <span className="text-[14.5px] font-bold text-[#1e293b] flex items-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a2b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 inline-block align-middle">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              SOP Instances
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#f1f5f9]">
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface min-w-[200px]">SOP TITLE</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface min-w-[250px]">SOP CODE</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">STATUS</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">PROCESS</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">FREQUENCY</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">TIMELINE</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={4} columns={7} />
                ) : sopList.length === 0 ? (
                  <tr><td colSpan={7} className="text-center p-12 text-[#94a3b8] text-[13.5px]">No SOPs match your selected filter criteria.</td></tr>
                ) : sopList.map(sop => (
                  <tr
                    key={sop.id || sop.code}
                    className="cursor-pointer border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]"
                    onClick={() => setViewingSop(sop)}
                  >
                    <td className="px-6 py-3.5 align-middle min-w-[200px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13.5px] font-semibold text-text-primary group-hover:text-primary transition-colors">
                          {sop.name || sop.title}
                        </span>
                        {sop.description && (
                          <span className="text-[12px] text-text-muted line-clamp-1">{sop.description}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-3.5 align-middle min-w-[250px]">
                      <span className="text-[12px] font-mono font-medium text-text-muted">{sop.code}</span>
                    </td>

                    <td className="px-6 py-3.5 align-middle">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[12px] font-medium border ${
                        sop.status === 'ACTIVE'
                          ? 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]'
                          : sop.status === 'COMPLETED'
                          ? 'bg-[#f1f5f9] text-[#475569] border-[#cbd5e1]'
                          : 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          sop.status === 'ACTIVE'
                            ? 'bg-[#10b981]'
                            : sop.status === 'COMPLETED'
                            ? 'bg-[#64748b]'
                            : 'bg-[#f59e0b]'
                        }`} />
                        {sop.status}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 align-middle">
                      <span className="text-[13px] text-text-secondary">{sop.processCategory || sop.process || 'N/A'}</span>
                    </td>

                    <td className="px-6 py-3.5 align-middle">
                      <span className="text-[13px] text-text-secondary">{FREQ_LABEL[sop.frequency] || sop.frequency || 'N/A'}</span>
                    </td>

                    <td className="px-6 py-3.5 align-middle">
                      <div className="flex flex-col gap-0.5 text-[12px] text-text-muted">
                        {sop.dueDayOffset != null && (
                          <span>Due Day Offset: {sop.dueDayOffset}</span>
                        )}
                        {sop.isRecurring != null && (
                          <span>{sop.isRecurring ? 'Recurring' : 'One-time'}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-3.5 text-right align-middle" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="bg-[#f1f5f9] border border-[#cbd5e1] text-[#334155] rounded-[6px] px-2 py-[4px] cursor-pointer text-[12px] font-semibold inline-flex items-center gap-1 hover:bg-[#e2e8f0]"
                          onClick={() => setViewingSop(sop)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && (
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemLabel="SOPs"
            />
          )}
        </div>
      </div>


      {viewingSop && <SopDetailModal
        isOpen={!!viewingSop}
        sop={viewingSop}
        isAdmin={isAdmin}
        currentUser={currentUser}
        userMap={userMap}
        onClose={() => setViewingSop(null)}
        onEdit={sop => openEditModal(sop)}
        onDelete={sop => setDeletingSop(sop)}
        onApprove={sop => handleApproveSop(sop)}
        onReject={sop => { setRejectingSop(sop); setRejectionReasonInput(''); }}
      />}

      <SopActivityLogModal
        isOpen={!!viewingSopHistory}
        sop={viewingSopHistory}
        onClose={() => setViewingSopHistory(null)}
      />

    </>
  );
}
