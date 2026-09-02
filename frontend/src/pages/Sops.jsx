import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import EntityPills from '../components/EntityPills';
import CustomSelect from '../components/CustomSelect';
import UserPickerModal from '../components/UserPickerModal';
import TableSkeleton from '../components/TableSkeleton';
import Pagination from '../components/Pagination';
import SopDetailModal from '../components/SopDetailModal';
import AssignedSopDetailsModal from '../components/AssignedSopDetailsModal';
import AssignSOPModal from '../components/AssignSOPModal';
import CreateSOPModal from '../components/CreateSOPModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SopActivityLogModal from '../components/SopActivityLogModal';
import Toast from '../components/Toast';
import { getSession } from '../auth/auth';
import { ENTITIES, getSops, deleteSop, getUsers, actionSop, getProcessCategories } from '../services/api';
import styles from './Sops.module.css';

const FREQ_LABEL = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ANNUAL: 'Annual', DAILY: 'Daily', WEEKLY: 'Weekly' };

const PROCESS_OPTIONS = [
  { value: 'Tax Compliance', label: 'Tax Compliance' },
  { value: 'Treasury & Cash Management', label: 'Treasury & Cash Management' },
  { value: 'Financial Reporting', label: 'Financial Reporting' },
  { value: 'Fixed Assets', label: 'Fixed Assets' },
  { value: 'Payroll & Statutory', label: 'Payroll & Statutory' },
];

const ENTITY_OPTIONS = [
  { value: 'CK_INDIA', label: 'CK India' },
  { value: 'CK_US', label: 'CK US' },
  { value: 'CK_UK', label: 'CK UK' },
  { value: 'CK_AUSTRALIA', label: 'CK Australia' },
];

const CREATOR_OPTIONS = [
  { value: 'usr-tushar-304', label: 'Tushar Seth (usr-tushar-304)' },
  { value: 'usr-prayasa-410', label: 'Prayasa Sharma (usr-prayasa-410)' },
  { value: 'usr-vivek-108', label: 'Vivek Raj (usr-vivek-108)' },
  { value: 'usr-mainak-215', label: 'Mainak Gupta (usr-mainak-215)' },
];

const APPROVER_OPTIONS = [
  { value: 'usr-vivek-108', label: 'Vivek Raj (usr-vivek-108)' },
  { value: 'usr-mainak-215', label: 'Mainak Gupta (usr-mainak-215)' },
  { value: 'usr-manoj-042', label: 'Manoj Agarwal (usr-manoj-042)' },
  { value: 'usr-avisek-499', label: 'Avisek Paul (usr-avisek-499)' },
];

const FREQUENCY_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'DAILY', label: 'Daily' },
];

const USER_NAME_MAP = {
  'usr-tushar-304': 'Tushar Seth',
  'usr-prayasa-410': 'Prayasa Sharma',
  'usr-vivek-108': 'Vivek Raj',
  'usr-mainak-215': 'Mainak Gupta',
  'usr-manoj-042': 'Manoj Agarwal',
  'usr-tushar': 'Tushar Seth',
  'usr-prayasa': 'Prayasa Sharma',
  'usr-vivek': 'Vivek Raj',
  'usr-mainak': 'Mainak Gupta',
  'usr-manoj': 'Manoj Agarwal',
};

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
  processCategory: 'Tax Compliance',
  entityCode: 'CK_INDIA',
  frequency: 'MONTHLY',
  dueDayOffset: 15,
  isRecurring: false,
  defaultMakerIds: ['usr-tushar-304', 'usr-prayasa-410'],
  defaultCheckerIds: ['usr-vivek-108', 'usr-mainak-215'],
};

const PAGE_SIZE = 10;

const PROCESS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Processes' },
  { value: 'Tax Compliance', label: 'Tax Compliance' },
  { value: 'Treasury & Cash Management', label: 'Treasury & Cash Management' },
  { value: 'Financial Reporting', label: 'Financial Reporting' },
  { value: 'Fixed Assets', label: 'Fixed Assets' },
  { value: 'Payroll & Statutory', label: 'Payroll & Statutory' },
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

const CREATOR_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Creators' },
  { value: 'usr-tushar-304', label: 'Tushar Seth' },
  { value: 'usr-prayasa-410', label: 'Prayasa Sharma' },
  { value: 'usr-vivek-108', label: 'Vivek Raj' },
  { value: 'usr-mainak-215', label: 'Mainak Gupta' },
];

const APPROVER_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Approvers' },
  { value: 'usr-vivek-108', label: 'Vivek Raj' },
  { value: 'usr-mainak-215', label: 'Mainak Gupta' },
  { value: 'usr-manoj-042', label: 'Manoj Agarwal' },
  { value: 'usr-avisek-499', label: 'Avisek Paul' },
];

const ADMIN_STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PENDING_CREATION', label: 'Pending Creation' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REJECTED', label: 'Rejected' },
];

const USER_STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function Sops() {
  const [selected, setSelected] = useState(ENTITIES.map(e => e.id));
  const [sopList, setSopList] = useState([]);
  const [userMap, setUserMap] = useState(USER_NAME_MAP);
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
  const [showModal, setShowModal] = useState(false);
  const [editingSop, setEditingSop] = useState(null);
  const [lockedAssignment, setLockedAssignment] = useState(null); // sidebar notification click
  const [viewingSop, setViewingSop] = useState(null);
  const [viewingAssignment, setViewingAssignment] = useState(null);
  const [viewingSopHistory, setViewingSopHistory] = useState(null);
  const [deletingSop, setDeletingSop] = useState(null);

  const [showMakerPicker, setShowMakerPicker] = useState(false);
  const [showCheckerPicker, setShowCheckerPicker] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const session = getSession();
  const currentUser = session?.user;
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email?.includes('mainak');

  // Handler for sidebar SOP task notification card click
  function handleOpenSopTask(task) {
    setLockedAssignment(task);
    setEditingSop(null);
    setShowModal(true);
  }

  async function loadData() {
    setLoading(true);
    const data = await getSops(selected, currentUser);
    if (data) {
      setSopList(data);
    }
    const apiUsers = await getUsers().catch(() => []);
    if (Array.isArray(apiUsers) && apiUsers.length > 0) {
      const map = {};
      apiUsers.forEach(u => {
        map[u.id || u.userId] = u.name || u.fullName;
      });
      setUserMap(prev => ({ ...prev, ...map }));
    }
    const categoriesData = await getProcessCategories().catch(() => []);
    if (Array.isArray(categoriesData) && categoriesData.length > 0) {
      const opts = [
        { value: 'ALL', label: 'All Processes' },
        ...categoriesData.map(c => ({ value: c.categoryName || c.categoryCode, label: c.categoryName || c.categoryCode }))
      ];
      setDynamicProcessOptions(opts);
    }
    setLoading(false);
  }

  useEffect(() => {
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

    window.addEventListener('open-sop-draft', handleDraftEvent);
    window.addEventListener('open-sop-review', handleReviewEvent);
    window.addEventListener('open-sop-view', handleViewEvent);
    window.addEventListener('sop-updated', handleUpdateEvent);

    // Check for draftSopCode, reviewSopCode, viewSopCode or sopId query params
    const params = new URLSearchParams(window.location.search);
    const draftCode = params.get('draftSopCode');
    const reviewCode = params.get('reviewSopCode');
    const viewCode = params.get('viewSopCode') || params.get('sopId') || params.get('sopCode');

    if (draftCode) {
      getSops([]).then(all => {
        const target = (all || []).find(s => (s.code === draftCode || s.sopCode === draftCode || s.id === draftCode || s.sopId === draftCode));
        if (target) {
          setLockedAssignment(target);
          setEditingSop(null);
          setShowModal(true);
        }
      });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (reviewCode) {
      getSops([]).then(all => {
        const target = (all || []).find(s => (s.code === reviewCode || s.sopCode === reviewCode || s.id === reviewCode || s.sopId === reviewCode));
        if (target) {
          setViewingSop(target);
        }
      });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (viewCode) {
      getSops([]).then(all => {
        const target = (all || []).find(s => (s.code === viewCode || s.sopCode === viewCode || s.id === viewCode || s.sopId === viewCode));
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
      window.removeEventListener('open-sop-draft', handleDraftEvent);
      window.removeEventListener('open-sop-review', handleReviewEvent);
      window.removeEventListener('open-sop-view', handleViewEvent);
      window.removeEventListener('sop-updated', handleUpdateEvent);
    };
  }, [selected]);

  function openCreateModal() {
    if (!isAdmin) {
      setSuccessMsg('');
      setErrorMsg('Access Denied: Only Admin users have permission to create SOPs.');
      return;
    }
    setEditingSop(null);
    setFormData(INITIAL_FORM);
    setErrorMsg('');
    setShowModal(true);
  }

  function openEditModal(sop) {
    const isAllowed = isAdmin || currentUser?.role === 'ADMIN' || sop.assignedCreatorId === currentUser?.id || (Array.isArray(sop.assignedCreatorIds) && sop.assignedCreatorIds.includes(currentUser?.id));
    if (!isAllowed) {
      setSuccessMsg('');
      setErrorMsg('Access Denied: Only assigned creators or Admin users have permission to edit this SOP.');
      return;
    }
    setEditingSop(sop);

    let rawMakers = sop.defaultMakerIds || (sop.defaultMakerNames ? sop.defaultMakerNames.map(n => USER_ID_MAP[n] || n) : (sop.defaultMakerId ? [sop.defaultMakerId] : ['usr-tushar-304']));
    let rawCheckers = sop.defaultCheckerIds || (sop.defaultCheckerNames ? sop.defaultCheckerNames.map(n => USER_ID_MAP[n] || n) : (sop.defaultCheckerId ? [sop.defaultCheckerId] : ['usr-mainak-215']));

    const makers = Array.from(new Set(rawMakers.map(id => USER_ID_MAP[id] || id)));
    const checkers = Array.from(new Set(rawCheckers.map(id => USER_ID_MAP[id] || id)));

    setFormData({
      sopCode: sop.code || sop.sopCode || '',
      title: sop.name || sop.title || '',
      description: sop.description || '',
      processCategory: sop.process || sop.processCategory || 'Tax Compliance',
      entityCode: sop.entityCode || 'CK_INDIA',
      frequency: sop.frequency || 'MONTHLY',
      dueDayOffset: sop.dueDay || sop.dueDayOffset || 15,
      isRecurring: sop.isRecurring !== undefined ? !!sop.isRecurring : false,
      defaultMakerIds: makers,
      defaultCheckerIds: checkers,
    });
    setErrorMsg('');
    setShowModal(true);
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'dueDayOffset' ? parseInt(value, 10) || 1 : value,
    }));
  }

  // Admin Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    sopCode: '',
    entityCode: 'CK_INDIA',
    processCategory: 'Tax Compliance',
    assignedCreatorId: 'usr-tushar-304',
    assignedApproverId: 'usr-vivek-108',
  });

  // Rejection Modal State
  const [rejectingSop, setRejectingSop] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  async function handleAssignSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!assignForm.sopCode.trim()) {
      setErrorMsg('SOP Code is required.');
      return;
    }
    try {
      setSaving(true);
      await assignSop(assignForm);
      setSuccessMsg(`SOP Assignment "${assignForm.sopCode}" created successfully! Creator assigned to draft for category "${assignForm.processCategory}".`);
      setShowAssignModal(false);
      setAssignForm({
        sopCode: '',
        entityCode: 'CK_INDIA',
        processCategory: 'Tax Compliance',
        assignedCreatorId: 'usr-tushar-304',
        assignedApproverId: 'usr-vivek-108',
      });
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create SOP assignment');
    } finally {
      setSaving(false);
    }
  }

  async function handleApproveSop(sop) {
    try {
      setSaving(true);
      await actionSop(sop.id || sop.sopId, { action: 'APPROVE', actorId: currentUser?.id || 'usr-vivek-108' });
      window.dispatchEvent(new Event('sop-updated'));
      setSuccessMsg(`SOP "${sop.name || sop.title || sop.code}" approved successfully! Status is now ACTIVE for compliance task generation.`);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to approve SOP');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmRejectSop(e) {
    e.preventDefault();
    if (!rejectingSop) return;
    try {
      setSaving(true);
      await actionSop(rejectingSop.id || rejectingSop.sopId, {
        action: 'REJECT',
        comment: rejectionReasonInput || 'SOP draft requires revision by creator.',
        actorId: currentUser?.id || 'usr-vivek-108'
      });
      window.dispatchEvent(new Event('sop-updated'));
      setSuccessMsg(`SOP "${rejectingSop.name || rejectingSop.title || rejectingSop.code}" rejected back to creator with revision comments.`);
      setRejectingSop(null);
      setRejectionReasonInput('');
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reject SOP');
    } finally {
      setSaving(false);
    }
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.sopCode.trim() || !formData.title.trim()) {
      setErrorMsg('SOP Code and Title are required.');
      return;
    }

    try {
      setSaving(true);
      const makerId = USER_ID_MAP[formData.defaultMakerIds[0]] || formData.defaultMakerIds[0] || 'usr-tushar-304';
      const checkerId = USER_ID_MAP[formData.defaultCheckerIds[0]] || formData.defaultCheckerIds[0] || 'usr-mainak-215';

      const payload = {
        ...formData,
        defaultMakerId: makerId,
        defaultCheckerId: checkerId,
        createdById: 'usr-mainak-215',
      };

      if (editingSop && (editingSop.status === 'PENDING_CREATION' || editingSop.status === 'REJECTED')) {
        await submitSopDraft(editingSop.sopId || editingSop.id || editingSop.code, {
          ...payload,
          actorId: currentUser?.id || 'usr-tushar-304'
        });
        setSuccessMsg(`SOP draft "${formData.title}" submitted for approval successfully! Status: PENDING_APPROVAL.`);
      } else if (editingSop) {
        await updateSop(editingSop.sopId || editingSop.id || editingSop.code, {
          ...payload,
          createdById: currentUser?.id || 'usr-tushar-304'
        });
        setSuccessMsg(`SOP "${formData.title}" updated & re-submitted for approval! Status is now PENDING_APPROVAL and assigned approver has been notified.`);
      } else {
        await createSop(payload);
        setSuccessMsg(`SOP "${formData.title}" created successfully with assigned Maker/Checker pool! Scheduled compliance tasks generated.`);
      }

      setShowModal(false);
      setEditingSop(null);
      setFormData(INITIAL_FORM);
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save SOP');
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

  function removeMakerUser(userId) {
    setFormData(prev => {
      if (prev.defaultMakerIds.length <= 1) return prev;
      return {
        ...prev,
        defaultMakerIds: prev.defaultMakerIds.filter(id => id !== userId)
      };
    });
  }

  function removeCheckerUser(userId) {
    setFormData(prev => {
      if (prev.defaultCheckerIds.length <= 1) return prev;
      return {
        ...prev,
        defaultCheckerIds: prev.defaultCheckerIds.filter(id => id !== userId)
      };
    });
  }

  const [runningScheduler, setRunningScheduler] = useState(false);

  async function handleRunScheduler() {
    if (!isAdmin) return;
    try {
      setRunningScheduler(true);
      setErrorMsg('');
      setSuccessMsg('');
      await generateScheduledTasks();
      setSuccessMsg('Task Scheduler executed successfully! Compliance tasks for all active SOPs generated.');
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to run task scheduler');
    } finally {
      setRunningScheduler(false);
    }
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

  const isFiltered = searchTerm.trim() !== '' ||
    selectedProcess !== 'ALL' ||
    selectedFrequency !== 'ALL' ||
    selectedMaker !== 'ALL' ||
    selectedChecker !== 'ALL' ||
    selectedCreator !== 'ALL' ||
    selectedApprover !== 'ALL' ||
    selectedStatus !== 'ALL';

  const filtered = sopList.filter(s => {
    if (!selected.includes(s.entityCode)) return false;

    // Non-admin users: hide raw PENDING_CREATION stubs unless assigned to currentUser
    if (!isAdmin && s.status === 'PENDING_CREATION' && s.assignedCreatorId !== currentUser.id) return false;

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
    <div className={styles.layout}>
      <Sidebar onOpenSopTask={handleOpenSopTask} />
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderInner}>
            <div>
              <h2>SOP Management</h2>
              <p>Standard operating procedures configured per corporate entity.</p>
            </div>
            <EntityPills selectedEntities={selected} onChange={setSelected} />
          </div>
        </div>

        <div className={styles.page}>

          <Toast message={successMsg} type="success" onClose={() => setSuccessMsg('')} />

          {/* SOP Filter Toolbar */}
          <div className={styles.filterRow}>
            <div className={styles.filterGroup} style={{ flex: 1.5, minWidth: 220 }}>
              <span className={styles.filterLabel}>Search SOP</span>
              <div className={styles.searchBox}>
                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search code, title, process..."
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Process Category</span>
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
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>Creator</span>
                  <CustomSelect
                    name="selectedCreator"
                    value={selectedCreator}
                    options={CREATOR_FILTER_OPTIONS}
                    onChange={e => {
                      setSelectedCreator(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>Approver</span>
                  <CustomSelect
                    name="selectedApprover"
                    value={selectedApprover}
                    options={APPROVER_FILTER_OPTIONS}
                    onChange={e => {
                      setSelectedApprover(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>Status</span>
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
              </>
            ) : (
              <>
                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>Frequency</span>
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

                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>Maker</span>
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

                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>Checker</span>
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

                <div className={styles.filterGroup}>
                  <span className={styles.filterLabel}>Status</span>
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
              <button className={styles.resetBtn} onClick={resetFilters} title="Reset all filters">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a2b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                {isAdmin ? 'SOP Governance Assignments' : 'Master Operating Procedures'}
              </span>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button className={styles.createBtn} onClick={() => setShowAssignModal(true)} style={{ background: '#0284c7' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="17" y1="11" x2="23" y2="11" />
                    </svg>
                    <span>Assign SOP Creation</span>
                  </button>
                </div>
              )}
            </div>

            <div className={styles.tableWrap}>
              {isAdmin ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>SOP CODE</th>
                      <th>PROCESS CATEGORY</th>
                      <th>CORPORATE ENTITY</th>
                      <th>ASSIGNED CREATOR</th>
                      <th>ASSIGNED APPROVER</th>
                      <th>STATUS</th>
                      <th style={{ textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={4} columns={7} />
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={7} className={styles.empty}>No SOP assignments created yet.</td></tr>
                    ) : paginatedSops.map(sop => (
                      <tr key={sop.id || sop.code} style={{ cursor: 'pointer' }} onClick={() => setViewingAssignment(sop)}>
                        <td className={styles.tdCode}>{sop.code}</td>
                        <td>{sop.process || sop.processCategory}</td>
                        <td>{sop.entity || sop.entityName}</td>
                        <td style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                          {(Array.isArray(sop.assignedCreatorNames) && sop.assignedCreatorNames.length > 0) ? sop.assignedCreatorNames.join(', ') : (sop.assignedCreatorName || sop.assignedCreatorId || 'N/A')}
                        </td>
                        <td style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                          {(Array.isArray(sop.assignedApproverNames) && sop.assignedApproverNames.length > 0) ? sop.assignedApproverNames.join(', ') : (sop.assignedApproverName || sop.assignedApproverId || 'N/A')}
                        </td>
                        <td>
                          {sop.status === 'PENDING_CREATION' && (
                            <span style={{ fontSize: 11, background: '#ffedd5', color: '#c2410c', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                              PENDING CREATION
                            </span>
                          )}
                          {sop.status === 'PENDING_APPROVAL' && (
                            <span style={{ fontSize: 11, background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                              PENDING APPROVAL
                            </span>
                          )}
                          {(sop.status === 'ACTIVE' || sop.status === 'APPROVED') && (
                            <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                              ACTIVE
                            </span>
                          )}
                          {sop.status === 'REJECTED' && (
                            <span style={{ fontSize: 11, background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                              REJECTED
                            </span>
                          )}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {(sop.status === 'PENDING_CREATION' || sop.status === 'REJECTED') && (
                              <button
                                type="button"
                                style={{ background: '#f0f9ff', border: '1px solid #0284c7', color: '#0369a1', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                                onClick={() => {
                                  setLockedAssignment(sop);
                                  setEditingSop(null);
                                  setShowModal(true);
                                }}
                              >
                                {sop.status === 'PENDING_CREATION' ? 'Create SOP' : 'Draft SOP'}
                              </button>
                            )}
                            <button
                              type="button"
                              title="View Assignment Details"
                              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              onClick={() => setViewingAssignment(sop)}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              View
                            </button>
                            <button
                              type="button"
                              title="Delete Assignment"
                              style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              onClick={() => setDeletingSop(sop)}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>CODE</th>
                      <th>TITLE</th>
                      <th>PROCESS</th>
                      <th>ENTITY</th>
                      <th>FREQUENCY</th>
                      <th>MAKERS</th>
                      <th>CHECKERS</th>
                      <th>STATUS</th>
                      <th>VERSION</th>
                      <th style={{ textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={4} columns={10} />
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={10} className={styles.empty}>No SOPs assigned for creation or approval.</td></tr>
                    ) : paginatedSops.map(sop => (
                      <tr key={sop.id || sop.code} style={{ cursor: 'pointer' }} onClick={() => setViewingSop(sop)}>
                        <td className={styles.tdCode}>{sop.code}</td>
                        <td className={styles.tdName}>{sop.name || sop.title}</td>
                        <td>{sop.process || sop.processCategory}</td>
                        <td>{sop.entity || sop.entityName}</td>
                        <td>
                          <span className={styles.freqBadge}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: 'middle' }}>
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            {FREQ_LABEL[sop.frequency] || sop.frequency}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500, color: '#1e293b' }}>
                            {sop.makers?.length ? sop.makers.join(', ') : sop.maker}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500, color: '#1e293b' }}>
                            {sop.checkers?.length ? sop.checkers.join(', ') : sop.checker}
                          </span>
                        </td>
                        <td>
                          {sop.status === 'PENDING_CREATION' && (
                            <span style={{ fontSize: 11, background: '#ffedd5', color: '#c2410c', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                              PENDING CREATION
                            </span>
                          )}
                          {sop.status === 'PENDING_APPROVAL' && (
                            <span style={{ fontSize: 11, background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                              PENDING APPROVAL
                            </span>
                          )}
                          {(sop.status === 'ACTIVE' || sop.status === 'APPROVED') && (
                            <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                              ACTIVE
                            </span>
                          )}
                          {sop.status === 'REJECTED' && (
                            <span style={{ fontSize: 11, background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
                              REJECTED
                            </span>
                          )}
                        </td>
                        <td>v{sop.version || 1}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {(sop.status === 'PENDING_CREATION' || sop.status === 'REJECTED') && (
                              (sop.assignedCreatorId === currentUser.id || currentUser.role === 'ADMIN') && (
                                <button
                                  type="button"
                                  style={{ background: '#f0f9ff', border: '1px solid #0284c7', color: '#0369a1', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                                  onClick={() => {
                                    setLockedAssignment(sop);
                                    setEditingSop(null);
                                    setShowModal(true);
                                  }}
                                >
                                  {sop.status === 'PENDING_CREATION' ? 'Create SOP' : 'Draft SOP'}
                                </button>
                              )
                            )}
                            {sop.status === 'PENDING_APPROVAL' && (
                              (sop.assignedApproverId === currentUser.id || (currentUser.role === 'ADMIN' && sop.assignedCreatorId !== currentUser.id)) && (
                                <>
                                  <button
                                    type="button"
                                    style={{ background: '#f0fdf4', border: '1px solid #16a34a', color: '#15803d', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                                    onClick={() => handleApproveSop(sop)}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    style={{ background: '#fff1f2', border: '1px solid #e11d48', color: '#be123c', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                                    onClick={() => { setRejectingSop(sop); setRejectionReasonInput(''); }}
                                  >
                                    Reject
                                  </button>
                                </>
                              )
                            )}
                            <button
                              type="button"
                              style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
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
              )}
            </div>

            {!loading && (
              <Pagination
                currentPage={currentPage}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                itemLabel="SOPs"
              />
            )}
          </div>
        </div>
      </main>

      <SopDetailModal
        isOpen={!!viewingSop}
        sop={viewingSop}
        isAdmin={isAdmin}
        currentUser={currentUser}
        onClose={() => setViewingSop(null)}
        onEdit={sop => openEditModal(sop)}
        onDelete={sop => setDeletingSop(sop)}
        onApprove={sop => handleApproveSop(sop)}
        onReject={sop => { setRejectingSop(sop); setRejectionReasonInput(''); }}
      />

      <AssignedSopDetailsModal
        isOpen={!!viewingAssignment}
        sop={viewingAssignment}
        onClose={() => setViewingAssignment(null)}
        onDelete={sop => setDeletingSop(sop)}
      />

      <ConfirmationModal
        isOpen={!!deletingSop}
        title="Delete Standard Operating Procedure"
        message={`Are you sure you want to delete SOP "${deletingSop?.name || deletingSop?.title || deletingSop?.code}"?`}
        confirmText="Delete SOP"
        confirmVariant="danger"
        submitting={deleting}
        onConfirm={confirmDeleteSop}
        onClose={() => setDeletingSop(null)}
      />

      <AssignSOPModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onSuccess={(msg) => { setSuccessMsg(msg); loadData(); }}
      />

      <CreateSOPModal
        isOpen={showModal}
        editingSop={editingSop}
        lockedAssignment={lockedAssignment}
        currentUser={currentUser}
        userMap={userMap}
        onClose={() => { setShowModal(false); setEditingSop(null); setLockedAssignment(null); }}
        onSuccess={(msg) => { setSuccessMsg(msg); setLockedAssignment(null); loadData(); }}
      />

      <SopActivityLogModal
        isOpen={!!viewingSopHistory}
        sop={viewingSopHistory}
        onClose={() => setViewingSopHistory(null)}
      />

      {rejectingSop && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 480 }}>
            <div className={styles.modalHeader} style={{ background: '#fff1f2', borderBottom: '1px solid #fecdd3' }}>
              <div>
                <h3 style={{ color: '#be123c' }}>Reject SOP Draft</h3>
                <p style={{ color: '#9f1239' }}>Revision feedback for: {rejectingSop.code}</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setRejectingSop(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleConfirmRejectSop}>
              <div className={styles.modalBody}>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label style={{ color: '#be123c', fontWeight: 700 }}>FEEDBACK *</label>
                  <textarea value={rejectionReasonInput} onChange={e => setRejectionReasonInput(e.target.value)} required rows={4} />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setRejectingSop(null)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={saving} style={{ background: '#dc2626' }}>Confirm Rejection</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
