import { useState, useEffect, useCallback } from 'react';
import CustomSelect from '../components/CustomSelect';
import TableSkeleton from '../components/TableSkeleton';
import Pagination from '../components/Pagination';
import SopDetailModal from '../components/SopDetailModal';
import SopActivityLogModal from '../components/SopActivityLogModal';
import Toast from '../components/Toast';
import { getSession } from '../auth/auth';
import { getSops, getSopTemplate, getSop, getUsers, getProcessCategories, getUserAccessibleCategories } from '../services/api';
import { useEntity } from '../context/EntityContext';
import dayjs from 'dayjs';


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

function formatSopTimeline(startDateStr, dueDateStr) {
  console.log('Start', startDateStr, typeof startDateStr)
  console.log('Due', dueDateStr, typeof dueDateStr)
  if (!startDateStr || !dueDateStr) return 'Invalid dates';

  const start = dayjs(startDateStr);
  const end = dayjs(dueDateStr);

  // 1. Format the dates
  const formattedStart = start.format('DD MMM YYYY'); // "20 Sep 2026"
  const formattedEnd = end.format('DD MMM YYYY');     // "21 Oct 2026"

  // 2. Calculate the difference
  const diffDays = end.diff(start, 'days');

  // 3. Determine the duration text
  let durationText = diffDays < 30
    ? `${diffDays} day${diffDays !== 1 ? 's' : ''}`
    : `${Math.round(diffDays / 30)} month${Math.round(diffDays / 30) !== 1 ? 's' : ''}`;

  return `${formattedStart} - ${formattedEnd} (${durationText})`;
}

function getTaskCompletionRatio(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return '0 / 0';
  }

  const totalTasks = tasks.length;
  
  // Counting tasks where status is 'OPEN' as completed, exactly as requested
  const completedTasks = tasks.filter(task => task.status != 'OPEN').length;

  return `${completedTasks} / ${totalTasks}`;
}

export default function SopInstances() {
  const [sopList, setSopList] = useState([]);
  const [userMap, setUserMap] = useState(USER_ID_MAP);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);



  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [selectedProcess, setSelectedProcess] = useState('ALL');
  const [selectedFrequency, setSelectedFrequency] = useState('ALL');
  // const [selectedMaker, setSelectedMaker] = useState('ALL');
  // const [selectedChecker, setSelectedChecker] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Filter Options
  const [dynamicProcessOptions, setDynamicProcessOptions] = useState(PROCESS_FILTER_OPTIONS);

  // SOP Details Modal States
  const [viewingSop, setViewingSop] = useState(null);
  const [viewingSopHistory, setViewingSopHistory] = useState(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');



  const session = getSession();
  const currentUser = session?.user;
  const isAdmin = currentUser?.role === 'ADMIN';
  const { selectedEntities } = useEntity();

  const targetUid = currentUser?.id || currentUser?.userId || currentUser?.email;
  const entitiesKey = Array.isArray(selectedEntities) ? selectedEntities.join(',') : String(selectedEntities || '');

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
    } catch (error) {
      console.error("Failed to fetch SOP instances:", error);
      setErrorMsg(error?.message || error || "Failed to fetch SOP instance data");
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, entitiesKey, selectedProcess, selectedFrequency, debouncedSearchTerm, currentPage]);



  const handleOpenSopDetail = async (sopItem) => {
    if (!sopItem) return;
    setViewingSop(sopItem);
    const targetId =sopItem.id || sopItem.sopId;
    if (targetId) {
      try {
        let fullDetail = await getSop(targetId).catch(() => null);
        if (fullDetail && (fullDetail.templateId || fullDetail.id)) {
          setViewingSop((prev) => (prev && (prev.id === sopItem.id || prev.templateId === targetId || prev.sopId === targetId) ? { ...prev, ...fullDetail } : prev));
        }
      } catch (err) {
        console.error("Failed to fetch full SOP details on row click:", err);
        setErrorMsg(err);
      }
    }
  };

  function getNamesForIds(ids = []) {
    if (!ids.length) return 'None assigned';
    return ids.map(id => userMap[id] || id).join(', ');
  }

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

  function resetFilters() {
    setSearchTerm('');
    setSelectedProcess('ALL');
    setSelectedFrequency('ALL');
    // setSelectedChecker('ALL');
    // setSelectedMaker('ALL');
    setSelectedStatus('ALL');
    setCurrentPage(1);
  }

  useEffect(() => {

    if (!selectedEntities) return;

    loadData();

    function handleViewEvent(e) {
      if (e.detail) {
        setViewingSop(e.detail);
      }
    }

    window.addEventListener('open-sop-view', handleViewEvent);

    // Check for draftSopCode, reviewSopCode, viewSopCode, action=createSop or sopId query params
    const params = new URLSearchParams(window.location.search);
    const viewCode = params.get('viewSopCode') || params.get('sopId') || params.get('sopCode');
    const actionParam = params.get('action');

    if (actionParam === 'viewSop' && viewCode) {
      getSops({}).then(result => {
        const all = result?.data || [];
        const target = all.find(s => (s.code === viewCode || s.sopCode === viewCode || s.id === viewCode || s.sopId === viewCode));
        if (target) {
          setViewingSop(target);
        }
      });
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('open-sop-view', handleViewEvent);
    };
  }, [selectedEntities, loadData]);

  // 2. Call it exactly once on the first render
  useEffect(() => {
    initializeUserMap();
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      if (isAdmin) {
        const categoriesData = await getProcessCategories().catch(() => []);
        if (isMounted && Array.isArray(categoriesData) && categoriesData.length > 0) {
          const opts = [
            { value: 'ALL', label: 'All Processes' },
            ...categoriesData.map(c => ({ value: c.categoryCode, label: c.categoryName }))
          ];
          setDynamicProcessOptions(opts);
        }
      } else if (targetUid) {
        const userCategories = await getUserAccessibleCategories(targetUid).catch(() => []);
        if (isMounted && Array.isArray(userCategories) && userCategories.length > 0) {
          const opts = [
            { value: 'ALL', label: 'All Processes' },
            ...userCategories.map(c => ({ value: typeof c === 'string' ? c : (c.categoryCode || c.categoryName), label: typeof c === 'string' ? c : (c.categoryName || c.categoryCode) }))
          ];
          setDynamicProcessOptions(opts);
        } else if (isMounted) {
          setDynamicProcessOptions([{ value: 'ALL', label: 'All Processes' }]);
        }
      }
    }
    loadCategories();
    return () => { isMounted = false; };
  }, []);


  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm ? searchTerm.trim() : '');
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const isFiltered = searchTerm.trim() !== '' ||
    selectedProcess !== 'ALL' ||
    selectedFrequency !== 'ALL' ||
    // selectedMaker !== 'ALL' ||
    // selectedChecker !== 'ALL' ||
    selectedStatus !== 'ALL';

  console.log('SOP list', sopList)

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
                placeholder="Search by SOP code or title"
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

        <div className="bg-bg-surface border border-[#e2e8f0] rounded-[12px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between px-6 py-[18px] bg-bg-surface border-b border-[#f1f5f9]">
            <span className="text-[14.5px] font-bold text-[#1e293b] flex items-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a2b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 inline-block align-middle">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              SOP Activities
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
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface min-w-[250px]">TIMELINE</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">TASKS</th>
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
                    onClick={() => handleOpenSopDetail(sop)}
                  >
                    <td className="px-6 py-3.5 align-middle min-w-[200px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13.5px] font-semibold text-blue-500 underline align-middle">
                          {sop.title || sop.name}
                        </span>
                        {/* {sop.description && (
                          <span className="text-[12px] text-text-muted line-clamp-1">{sop.description}</span>
                        )} */}
                      </div>
                    </td>

                    <td className="px-6 py-3.5 align-middle min-w-[250px]">
                      <span className="text-[12px] font-mono font-medium text-text-muted">{sop.code}</span>
                    </td>

                    <td className="px-6 py-3.5 align-middle">
                      <span className={`inline-flex items-center gap-1.5 px-1 py-1 rounded-[6px] text-[10px] font-medium border ${sop.status === 'ACTIVE'
                        ? 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]'
                        : sop.status === 'COMPLETED'
                          ? 'bg-[#f1f5f9] text-[#475569] border-[#cbd5e1]'
                          : 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sop.status === 'ACTIVE'
                          ? 'bg-[#10b981]'
                          : sop.status === 'COMPLETED'
                            ? 'bg-[#64748b]'
                            : 'bg-[#f59e0b]'
                          }`} />
                        {sop.status === 'ACTIVE' ? 'IN PROGRESS' : sop.status}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 align-middle">
                      <span className="text-[13px] text-text-secondary">{sop.processCategory || sop.process || 'N/A'}</span>
                    </td>

                    <td className="px-6 py-3.5 align-middle">
                      <div className="flex flex-col gap-0.5 text-[12px] text-text-muted">
                        {formatSopTimeline(sop.startDateTime, sop.dueDateTime)}
                      </div>
                    </td>

                    <td className="px-6 py-3.5 align-middle">
                      <div className="flex flex-col gap-0.5 text-[12px] text-text-muted">
                        {getTaskCompletionRatio(sop.taskStatusArr)}
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
      />}

      <SopActivityLogModal
        isOpen={!!viewingSopHistory}
        sop={viewingSopHistory}
        onClose={() => setViewingSopHistory(null)}
      />

    </>
  );
}
