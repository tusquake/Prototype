/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import TableSkeleton from '../components/TableSkeleton';
import Pagination from '../components/Pagination';
import SopActivityLogModal from '../components/SopActivityLogModal';
import UserAvatarGroup from '../components/UserAvatarGroup';
import Toast from '../components/Toast';
import CreateSopDrawer from '../components/CreateSOPDrawer';
import Tooltip from '../components/Tooltip';

import { getSession } from '../auth/auth';
import { getSopTemplates, getSopTemplate, getUsers, actionSop, activateSopTemplate, rejectSopTemplate, getProcessCategories, getUserCreatableCategories, getUserAccessibleCategories, getUsersByPermission } from '../services/api';
import { useEntity } from '../context/EntityContext';



const FREQ_LABEL = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUAL: 'Annual',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
};

const PAGE_SIZE = 10;


const FREQUENCY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Frequencies' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'WEEKLY', label: 'Weekly' },
];

const CREATOR_FILTER_OPTIONS = [{ value: 'ALL', label: 'All Creators' }];
const APPROVER_FILTER_OPTIONS = [{ value: 'ALL', label: 'All Approvers' }];

const ADMIN_STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REJECTED', label: 'Rejected' },
];

const USER_STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REJECTED', label: 'Rejected' },
];

function isSopCreator(sop, userId) {
  if (!sop || !userId) return false;
  if (sop.createdById) {
    return sop.createdById === userId
  }
  return false;
}

function isSopApprover(sop, userId) {
  if (!sop || !userId) return false;
  if (Array.isArray(sop.assignedApproverIds) && sop.assignedApproverIds.length > 0) {
    return sop.assignedApproverIds.includes(userId);
  }
  return false;
}

export default function Sops() {
  const [sopTemplateList, setSopTemplateList] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingDraftTemplate, setEditingDraftTemplate] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [totalItems, setTotalItems] = useState(0)


  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [selectedProcess, setSelectedProcess] = useState('ALL');
  const [selectedFrequency, setSelectedFrequency] = useState('ALL');
  const [selectedMaker, setSelectedMaker] = useState('ALL');
  const [selectedChecker, setSelectedChecker] = useState('ALL');
  const [selectedCreator, setSelectedCreator] = useState('ALL');
  const [selectedApprover, setSelectedApprover] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modal States
  const [dynamicProcessOptions, setDynamicProcessOptions] = useState([]);
  // const [dynamicCreatorFilterOptions, setDynamicCreatorFilterOptions] = useState(CREATOR_FILTER_OPTIONS);
  // const [dynamicApproverFilterOptions, setDynamicApproverFilterOptions] = useState(APPROVER_FILTER_OPTIONS);

  const [creatableCategories, setCreatableCategories] = useState([]);
  const [viewingSopHistory, setViewingSopHistory] = useState(null);


  // const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showCreateCompleteModal, setShowCreateCompleteModal] = useState(false);

  // const [runningScheduler, setRunningScheduler] = useState(false);
  // Admin Assignment Modal State

  // Rejection Modal State
  // const [rejectingSop, setRejectingSop] = useState(null);
  // const [rejectionReasonInput, setRejectionReasonInput] = useState('');


  const session = getSession();
  const currentUser = session?.user;
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email?.includes('mainak');
  const { selectedEntities } = useEntity();


  const entitiesKey = Array.isArray(selectedEntities) ? selectedEntities.join(',') : String(selectedEntities || '');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, totalElements, totalPages } = await getSopTemplates({
        status: selectedStatus,
        entities: Array.isArray(selectedEntities) ? selectedEntities : (selectedEntities ? [selectedEntities] : []),
        category: selectedProcess,
        frequency: selectedFrequency,
        search: debouncedSearchTerm,
        page: currentPage > 0 ? currentPage - 1 : 0,
        size: PAGE_SIZE ?? 10,
      });
      setTotalItems(totalElements ?? 0);
      const combined = Array.isArray(data) ? data.filter(
        (t, idx, arr) => arr.findIndex(x => x.id === t.id) === idx
      ) : [];
      setSopTemplateList(combined);
    } catch (error) {
      console.log(error);
      setErrorMsg(error?.message || error || "Failed to fetch sop template data");
    } finally {
      setLoading(false);
    }

  }, [selectedStatus, entitiesKey, selectedProcess, selectedFrequency, currentPage, debouncedSearchTerm]);


  // async function loadData() {
  //   setLoading(true);
  //   try {
  //     const { data, totalElements } = await getSopTemplates(selectedStatus, selectedEntities, selectedProcess, selectedFrequency, debouncedSearchTerm, {
  //       page: currentPage ?? 1,
  //       size: PAGE_SIZE ?? 10,
  //       sort: ['ascending']
  //     });
  //     setTotalItems(totalElements ?? 0)
  //     // let combined = [];
  //     // if (Array.isArray(data) && data.length > 0) {
  //     //   data.forEach(t => {
  //     //     if (!combined.some(existing => existing.id === t.id || (existing.code && existing.code === t.code))) {
  //     //       combined.push(t);
  //     //     }
  //     //   });
  //     // }
  //     setSopTemplateList(data);
  //   } catch (error) {
  //     console.log(error)
  //     setErrorMsg(error || "Failed to fetch sop template data")
  //   }
  //   finally {
  //     setLoading(false);
  //   }
  // }


  // async function handleConfirmRejectSop(e) {
  //   e.preventDefault();
  //   if (!rejectingSop) return;
  //   try {
  //     setSaving(true);
  //     if (rejectingSop.isTemplate || rejectingSop.templateId) {
  //       await rejectSopTemplate(rejectingSop.templateId || rejectingSop.id, rejectionReasonInput || 'SOP blueprint requires revision by creator.');
  //     } else {
  //       await actionSop(rejectingSop.id || rejectingSop.sopId, {
  //         action: 'REJECT',
  //         comment: rejectionReasonInput || 'SOP draft requires revision by creator.',
  //         actorId: currentUser?.id || 'usr-vivek-108'
  //       });
  //     }
  //     window.dispatchEvent(new Event('sop-updated'));
  //     setSuccessMsg(`SOP "${rejectingSop.name || rejectingSop.title || rejectingSop.code}" rejected back to creator with revision comments.`);
  //     setRejectingSop(null);
  //     setRejectionReasonInput('');
  //     await loadData();
  //   } catch (err) {
  //     setErrorMsg(err.message || 'Failed to reject SOP');
  //   } finally {
  //     setSaving(false);
  //   }
  // }


  // function getNamesForIds(ids = []) {
  //   if (!ids.length) return 'None assigned';
  //   return ids.map(id => userMap[id] || id).join(', ');
  // }

  // async function handleRunScheduler() {
  //   if (!isAdmin) return;
  //   try {
  //     setRunningScheduler(true);
  //     setErrorMsg('');
  //     setSuccessMsg('');
  //     await generateScheduledTasks();
  //     setSuccessMsg('Task Scheduler executed successfully! Compliance tasks for all active SOPs generated.');
  //     await loadData();
  //   } catch (err) {
  //     setErrorMsg(err.message || 'Failed to run task scheduler');
  //   } finally {
  //     setRunningScheduler(false);
  //   }
  // }

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  // useEffect(() => {

  //   if (selectedProcess && selectedProcess !== 'ALL') {
  //     try {
  //       const [creators, approvers] = Promise.all([
  //         getUsersByPermission(selectedProcess, 'CREATOR'),
  //         getUsersByPermission(selectedProcess, 'APPROVER')
  //       ])
  //       const crList = Array.isArray(creators) ? creators : [];
  //       const aList = Array.isArray(approvers) ? approvers : [];

  //       setDynamicCreatorFilterOptions([
  //         { value: 'ALL', label: 'All Creators' },
  //         ...crList.map(u => ({ value: u.id, label: u.name || u.id }))
  //       ]);
  //       setDynamicApproverFilterOptions([
  //         { value: 'ALL', label: 'All Approvers' },
  //         ...aList.map(u => ({ value: u.id, label: u.name || u.id }))
  //       ]);
  //     } catch {
  //       setDynamicCreatorFilterOptions([{ value: 'ALL', label: 'All Creators' }]);
  //       setDynamicApproverFilterOptions([{ value: 'ALL', label: 'All Approvers' }]);
  //     };
  //   } else {
  //     getUsers().then(users => {
  //       if (Array.isArray(users)) {
  //         setDynamicCreatorFilterOptions([
  //           { value: 'ALL', label: 'All Creators' },
  //           ...users.map(u => ({ value: u.id || u.userId, label: u.name || u.fullName }))
  //         ]);
  //         setDynamicApproverFilterOptions([
  //           { value: 'ALL', label: 'All Approvers' },
  //           ...users.map(u => ({ value: u.id || u.userId, label: u.name || u.fullName }))
  //         ]);
  //       }
  //     }).catch(() => { });
  //   }
  // }, [selectedProcess]);


  useEffect(() => {
    const timer = setTimeout(() => {

      setDebouncedSearchTerm(searchTerm? searchTerm.trim() : '')
      setCurrentPage(1);

    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    async function initializeUserMap() {
      try {
        const { data: usersList } = await getUsers();

        if (Array.isArray(usersList)) {
          const dynamicUserMap = {};

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

          // setDynamicCreatorFilterOptions([
          //   { value: 'ALL', label: 'All Creators' },
          //   ...usersList.map(u => ({ value: u.id, label: u.name || u.id }))
          // ]);
          // setDynamicApproverFilterOptions([
          //   { value: 'ALL', label: 'All Approvers' },
          //   ...usersList.map(u => ({ value: u.id, label: u.name || u.id }))
          // ]);

          setUserMap(dynamicUserMap);
        }
      } catch (error) {
        console.error("Failed to fetch users for userMap:", error);
      }
    }
    async function initializeFilterOptions() {
      setLoading(true);
      try {
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
        console.log(error)
        setErrorMsg(error || "Failed to fetch sop template data")

      }
      finally {
        setLoading(false)
      }
    }

    async function fetchInitialData() {
      setLoading(true);
      try {
        // Run both async initialization tasks in parallel
        await Promise.all([
          initializeUserMap(),
          initializeFilterOptions()
        ]);
      } catch (error) {
        console.error(error);
        setErrorMsg(error?.message || error || "Failed to fetch initial data");
      } finally {
        setLoading(false);
      }
    }
    fetchInitialData()
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();

  const handleOpenTemplateById = useCallback(async (templateId, isView = true) => {
    if (!templateId) return;
    try {
      const existing = sopTemplateList.find(t => t.templateId === templateId || t.id === templateId || t.templateCode === templateId || t.sopCode === templateId);
      if (existing) {
        setEditingDraftTemplate(existing);
        setIsViewOnly(isView);
        setShowCreateCompleteModal(true);
      }
      const fullDetail = await getSopTemplate(templateId).catch(() => null);
      if (fullDetail && (fullDetail.templateId || fullDetail.id)) {
        setEditingDraftTemplate(fullDetail);
        setIsViewOnly(isView);
        setShowCreateCompleteModal(true);
      }
    } catch (e) {
      console.error('Failed to open template by ID:', e);
    }
  }, [sopTemplateList]);

  useEffect(() => {
    const openId = searchParams.get('openTemplateId') || searchParams.get('templateId') || searchParams.get('reviewSopCode');
    if (openId) {
      handleOpenTemplateById(openId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, handleOpenTemplateById, setSearchParams]);

  useEffect(() => {
    function handleEvent(e) {
      const id = e.detail?.templateId || e.detail?.sopId || e.detail?.id;
      if (id) {
        handleOpenTemplateById(id);
      }
    }
    window.addEventListener('open-sop-template', handleEvent);
    return () => window.removeEventListener('open-sop-template', handleEvent);
  }, [handleOpenTemplateById]);

  const isFiltered = searchTerm.trim() !== '' ||
    selectedProcess !== 'ALL' ||
    selectedFrequency !== 'ALL' ||
    selectedMaker !== 'ALL' ||
    selectedChecker !== 'ALL' ||
    selectedCreator !== 'ALL' ||
    selectedApprover !== 'ALL' ||
    selectedStatus !== 'ALL';

  const paginatedSops = sopTemplateList;

  return (
    <>
      <div className="p-2 md:px-3 w-full max-w-full box-border">

        {/* SOP Template Filter Toolbar */}
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
                  setLoading(true)
                  setSearchTerm(e.target.value);
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
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Creator</span>
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
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Approver</span>
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

              {/* <div className="relative flex flex-col gap-1.5 flex-1 min-w-[135px]">
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
              </div> */}

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

        {/* SOP Template Table  */}
        <div className="bg-bg-surface border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between px-6 py-[18px] bg-bg-surface border-b border-[#f1f5f9]">
            <span className="text-[14.5px] font-bold text-[#1e293b] flex items-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a2b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 inline-block align-middle">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Templates for Standard Operating Procedures
            </span>
            {(isAdmin || (Array.isArray(creatableCategories) && creatableCategories.length > 0)) && (
              <div className="flex gap-2.5 items-center">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[6px] bg-[#2563eb] text-white text-[12.5px] font-semibold border-none cursor-pointer shadow-sm transition-all duration-150 hover:bg-[#1d4ed8]"
                  onClick={() => {
                    setEditingDraftTemplate(null);
                    setIsViewOnly(false);
                    setShowCreateCompleteModal(true);
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Create SOP</span>
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#f1f5f9]">
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface min-w-[200px]">TITLE</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface min-w-[250px]">CODE</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">PROCESS</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface max-w-[100px]">STATUS</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">FREQUENCY</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface  min-w-[150px]">MAKERS</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface min-w-[150px]">CHECKERS</th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={4} columns={10} />
                ) : paginatedSops.length === 0 ? (
                  <tr><td colSpan={10} className="text-center p-12 text-[#94a3b8] text-[13.5px]">No SOPs assigned for creation or approval.</td></tr>
                ) : paginatedSops.map(sop => (
                  <tr
                    key={sop.id || sop.code}
                    className="cursor-pointer border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]"
                    onClick={() => handleOpenTemplateById(sop.templateId || sop.id, true)}
                  >
                    <td className="px-6 py-3.5 text-[13.5px] font-semibold text-blue-500 underline align-middle">{sop.name || sop.title}</td>
                    <td className="px-6 py-3.5 text-[12px] font-mono text-text-muted align-middle">{sop.code}</td>
                    <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{sop.process || sop.processCategory}</td>
                    <td className="px-6 py-3.5 text-[13.5px] align-middle">
                      {sop.status === 'DRAFT' && (
                        <span className="text-[11px] bg-[#e0f2fe] text-[#0369a1] px-2 py-[3px] rounded-[4px] font-bold inline-block">
                          DRAFT
                        </span>
                      )}
                      {sop.status === 'PENDING_APPROVAL' && (
                        <span className="text-[11px] bg-[#fef3c7] text-[#b45309] px-2 py-[3px] rounded-[4px] font-bold inline-block">
                          PENDING APPROVAL
                        </span>
                      )}
                      {(sop.status === 'ACTIVE' || sop.status === 'APPROVED') && (
                        <span className="text-[11px] bg-[#dcfce7] text-[#15803d] px-2 py-[3px] rounded-[4px] font-bold inline-block">
                          ACTIVE
                        </span>
                      )}
                      {sop.status === 'REJECTED' && (
                        <span className="text-[11px] bg-[#fee2e2] text-[#b91c1c] px-2 py-[3px] rounded-[4px] font-bold inline-block">
                          REJECTED
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">

                      <span className="inline-flex items-center px-[10px] py-[3px] rounded-[6px] text-[11.5px] font-semibold bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 inline-block align-middle">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        {FREQ_LABEL[sop.frequency] || sop.frequency}
                      </span>

                    </td>
                    <td className="px-6 py-3.5 text-[13.5px] align-middle" >
                      <UserAvatarGroup
                        // Safely construct an array of names. If map returns undefined names, filter(Boolean) removes them.
                        users={
                          sop.makers?.length
                            ? sop.makers.map((item) => userMap[item]).filter(Boolean)
                            : (sop.maker ? [sop.maker] : [])
                        }
                        isPending={sop.status === 'DRAFT'}
                        max={3}
                      />
                    </td>
                    <td className="px-6 py-3.5 text-[13.5px] align-middle ">
                      <UserAvatarGroup
                        users={sop.checkers?.length ? sop.checkers.map((item) => userMap[item]).filter(Boolean) : (sop.checker ? [sop.checker] : [])}
                        isPending={sop.status === 'DRAFT'}
                        max={3}
                      />
                    </td>
                    <td className="px-6 py-3.5 text-[13.5px] align-middle" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5 justify-end">
                        <div className="flex items-center justify-end gap-1.5">

                          {/* Edit / Draft Button */}
                          {sop.status === 'DRAFT' && (isSopCreator(sop, currentUser?.id) || isAdmin) && (
                            <button
                              type="button"
                              className="group relative flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevents row click
                                setEditingDraftTemplate(sop);
                                setIsViewOnly(false);
                                setShowCreateCompleteModal(true);
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>

                              {/* Tooltip */}
                              <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                <div className="whitespace-nowrap rounded bg-slate-800 px-2.5 py-1 text-[10px] font-medium text-white shadow-md">
                                  Edit Draft
                                </div>
                                <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800"></div>
                              </div>
                            </button>
                          )}

                          {/* Approve & Reject Buttons */}
                          {sop.status === 'PENDING_APPROVAL' && (isSopApprover(sop, currentUser?.id) || isAdmin) && (
                            <>
                              {/* Approve Button */}
                              <button
                                type="button"
                                className="group relative flex h-7 w-7 items-center justify-center rounded-md text-green-600 transition-colors hover:bg-green-50 hover:text-green-700"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevents row click
                                  setEditingDraftTemplate(sop);
                                  setIsViewOnly(true);
                                  setShowCreateCompleteModal(true);
                                }}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>

                                <Tooltip name={'Approve'} />
                              </button>

                              {/* Reject Button */}
                              <button
                                type="button"
                                className="group relative flex h-7 w-7 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevents row click
                                  setEditingDraftTemplate(sop);
                                  setIsViewOnly(true);
                                  setShowCreateCompleteModal(true);
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                                <Tooltip name={'Reject'} />
                              </button>
                            </>
                          )}
                        </div>
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

      {/* This modal is for creating sop */}

      {showCreateCompleteModal && (

        <CreateSopDrawer
          isOpen={showCreateCompleteModal}
          editingTemplate={editingDraftTemplate}
          isViewOnly={isViewOnly}
          creatableCategories={creatableCategories}
          currentUser={currentUser}
          userMap={userMap}
          onStepSuccess={() => loadData()}
          onCancel={()=>{
            setShowCreateCompleteModal(false);
            setEditingDraftTemplate(null);
            setIsViewOnly(false);
            setSearchParams({}, { replace: true });
          }}
          onClose={() => {
            setShowCreateCompleteModal(false);
            setEditingDraftTemplate(null);
            setIsViewOnly(false);
            setSearchParams({}, { replace: true });
            loadData();
          }}
          onSuccess={(msg) => {
            setSuccessMsg(msg);
            setShowCreateCompleteModal(false);
            setEditingDraftTemplate(null);
            setIsViewOnly(false);
            setSearchParams({}, { replace: true });
            loadData();
          }}
        />
      )}

      <SopActivityLogModal
        isOpen={!!viewingSopHistory}
        sop={viewingSopHistory}
        onClose={() => setViewingSopHistory(null)}
      />

      {/* {rejectingSop && (
        <div className="fixed inset-0 bg-[#091124]/65 backdrop-blur-sm flex items-center justify-center z-[999] p-6">
          <div className="bg-bg-surface rounded-[16px] w-full max-w-[480px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.1)] overflow-hidden animate-modal-slide-in">
            <div className="p-[24px_28px] bg-[#fff1f2] border-b border-[#fecdd3] flex items-start justify-between">
              <div>
                <h3 className="text-[17px] font-bold text-[#be123c] tracking-[-0.2px]">Reject SOP Draft</h3>
                <p className="text-[12.5px] text-[#9f1239] mt-0.5">Revision feedback for: {rejectingSop.code}</p>
              </div>
              <button
                type="button"
                className="bg-white/15 border border-white/25 rounded-[8px] w-8 h-8 text-white cursor-pointer flex items-center justify-center transition-all duration-150 hover:bg-white/30"
                onClick={() => setRejectingSop(null)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleConfirmRejectSop}>
              <div className="p-7 grid grid-cols-1 gap-[18px] max-h-[72vh] overflow-y-auto [scrollbar-gutter:stable]">
                <div className="col-span-full flex flex-col gap-1.5 min-w-0">
                  <label className="text-[12px] font-bold text-[#be123c] uppercase tracking-[0.4px]">FEEDBACK *</label>
                  <textarea
                    className="w-full p-[10px_14px] rounded-[8px] border border-[#cbd5e1] bg-bg-surface text-[13.5px] text-text-primary outline-none transition-all duration-150 resize-y min-h-[85px] leading-normal focus:border-[#2563eb] focus:bg-bg-surface focus:ring-3 focus:ring-[rgba(37,99,235,0.15)]"
                    value={rejectionReasonInput}
                    onChange={e => setRejectionReasonInput(e.target.value)}
                    required
                    rows={4}
                  />
                </div>
              </div>
              <div className="p-[18px_28px] border-t border-[#e2e8f0] bg-[#f8fafc] flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-5 py-[9px] rounded-[8px] border border-[#cbd5e1] bg-bg-surface text-[#475569] text-[13px] font-semibold cursor-pointer transition-all duration-150 hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                  onClick={() => setRejectingSop(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-[22px] py-[9px] rounded-[8px] border-none bg-[#dc2626] text-white text-[13px] font-semibold cursor-pointer shadow-[0_4px_12px_rgba(37,99,235,0.35)] transition-all duration-150 hover:bg-[#b91c1c] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={saving}
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )} */}

      <Toast message={successMsg} type="success" onClose={() => setSuccessMsg('')} />
      <Toast message={errorMsg} type="error" onClose={() => setErrorMsg('')} />


    </>
  );
}
