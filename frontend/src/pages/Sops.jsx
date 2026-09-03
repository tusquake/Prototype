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
    <>
      <main className="ml-[248px] flex-1 min-w-0 bg-bg-base">
        <div className="w-full bg-[#f8fafc] border-b border-[#cbd5e1] px-8 py-[18px] shadow-sm box-border">
          <div className="flex items-center justify-between gap-4 w-full max-w-full box-border">
            <div>
              <h2 className="text-[22px] font-bold text-[#1e293b]">SOP Management</h2>
              <p className="text-[13.5px] text-text-muted mt-1">Standard operating procedures configured per corporate entity.</p>
            </div>
            <EntityPills selectedEntities={selected} onChange={setSelected} />
          </div>
        </div>

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
                <div className="relative flex flex-col gap-1.5 flex-1 min-w-[135px]">
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Creator</span>
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

                <div className="relative flex flex-col gap-1.5 flex-1 min-w-[135px]">
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.04em]">Approver</span>
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
                {isAdmin ? 'SOP Governance Assignments' : 'Master Operating Procedures'}
              </span>
              {isAdmin && (
                <div className="flex gap-2.5 items-center">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-[6px] bg-[#0284c7] text-white text-[12.5px] font-semibold border-none cursor-pointer shadow-sm transition-all duration-150 hover:bg-[#0369a1]"
                    onClick={() => setShowAssignModal(true)}
                  >
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

            <div className="overflow-x-auto w-full">
              {isAdmin ? (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#f1f5f9]">
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">SOP CODE</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">PROCESS CATEGORY</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">CORPORATE ENTITY</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">ASSIGNED CREATOR</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">ASSIGNED APPROVER</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">STATUS</th>
                      <th className="px-6 py-3 text-right text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={4} columns={7} />
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={7} className="text-center p-12 text-[#94a3b8] text-[13.5px]">No SOP assignments created yet.</td></tr>
                    ) : paginatedSops.map(sop => (
                      <tr
                        key={sop.id || sop.code}
                        className="cursor-pointer border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]"
                        onClick={() => setViewingAssignment(sop)}
                      >
                        <td className="px-6 py-3.5 text-[12px] font-mono text-text-muted align-middle">{sop.code}</td>
                        <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{sop.process || sop.processCategory}</td>
                        <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{sop.entity || sop.entityName}</td>
                        <td className="px-6 py-3.5 text-[12px] font-semibold text-[#334155] align-middle">
                          {(Array.isArray(sop.assignedCreatorNames) && sop.assignedCreatorNames.length > 0) ? sop.assignedCreatorNames.join(', ') : (sop.assignedCreatorName || sop.assignedCreatorId || 'N/A')}
                        </td>
                        <td className="px-6 py-3.5 text-[12px] font-semibold text-[#334155] align-middle">
                          {(Array.isArray(sop.assignedApproverNames) && sop.assignedApproverNames.length > 0) ? sop.assignedApproverNames.join(', ') : (sop.assignedApproverName || sop.assignedApproverId || 'N/A')}
                        </td>
                        <td className="px-6 py-3.5 text-[13.5px] align-middle">
                          {sop.status === 'PENDING_CREATION' && (
                            <span className="text-[11px] bg-[#ffedd5] text-[#c2410c] px-2 py-[3px] rounded-[4px] font-bold inline-block">
                              PENDING CREATION
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
                        <td className="px-6 py-3.5 text-[13.5px] align-middle" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1.5 justify-end">
                            {(sop.status === 'PENDING_CREATION' || sop.status === 'REJECTED') && (
                              <button
                                type="button"
                                className="bg-[#f0f9ff] border border-[#0284c7] text-[#0369a1] rounded-[6px] px-2 py-[4px] cursor-pointer text-[12px] font-bold"
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
                              className="bg-[#f1f5f9] border border-[#cbd5e1] text-[#334155] rounded-[6px] px-2 py-[4px] cursor-pointer text-[12px] font-semibold inline-flex items-center gap-1"
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
                              className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[#ef4444] rounded-[6px] px-2 py-[4px] cursor-pointer text-[12px] font-semibold inline-flex items-center gap-1"
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
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#f1f5f9]">
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">CODE</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">TITLE</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">PROCESS</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">ENTITY</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">FREQUENCY</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">MAKERS</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">CHECKERS</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">STATUS</th>
                      <th className="px-6 py-3 text-left text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">VERSION</th>
                      <th className="px-6 py-3 text-right text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.6px] bg-bg-surface">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableSkeleton rows={4} columns={10} />
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={10} className="text-center p-12 text-[#94a3b8] text-[13.5px]">No SOPs assigned for creation or approval.</td></tr>
                    ) : paginatedSops.map(sop => (
                      <tr
                        key={sop.id || sop.code}
                        className="cursor-pointer border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]"
                        onClick={() => setViewingSop(sop)}
                      >
                        <td className="px-6 py-3.5 text-[12px] font-mono text-text-muted align-middle">{sop.code}</td>
                        <td className="px-6 py-3.5 text-[13.5px] font-semibold text-text-primary align-middle">{sop.name || sop.title}</td>
                        <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{sop.process || sop.processCategory}</td>
                        <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">{sop.entity || sop.entityName}</td>
                        <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">
                          {sop.status === 'PENDING_CREATION' ? (
                            <span className="text-[#94a3b8] italic text-[12px]">—</span>
                          ) : (
                            <span className="inline-flex items-center px-[10px] py-[3px] rounded-[6px] text-[11.5px] font-semibold bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 inline-block align-middle">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              {FREQ_LABEL[sop.frequency] || sop.frequency}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-[13.5px] align-middle">
                          <span
                            className={`font-medium ${sop.status === 'PENDING_CREATION'
                              ? 'text-[#94a3b8] italic text-[12px]'
                              : 'text-[#1e293b]'
                              }`}
                          >
                            {sop.status === 'PENDING_CREATION' ? '—' : (sop.makers?.length ? sop.makers.join(', ') : (sop.maker || '—'))}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-[13.5px] align-middle">
                          <span
                            className={`font-medium ${sop.status === 'PENDING_CREATION'
                              ? 'text-[#94a3b8] italic text-[12px]'
                              : 'text-[#1e293b]'
                              }`}
                          >
                            {sop.status === 'PENDING_CREATION' ? '—' : (sop.checkers?.length ? sop.checkers.join(', ') : (sop.checker || '—'))}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-[13.5px] align-middle">
                          {sop.status === 'PENDING_CREATION' && (
                            <span className="text-[11px] bg-[#ffedd5] text-[#c2410c] px-2 py-[3px] rounded-[4px] font-bold inline-block">
                              PENDING CREATION
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
                        <td className="px-6 py-3.5 text-[13.5px] text-[#334155] align-middle">v{sop.version || 1}</td>
                        <td className="px-6 py-3.5 text-[13.5px] align-middle" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1.5 justify-end">
                            {(sop.status === 'PENDING_CREATION' || sop.status === 'REJECTED') && (
                              (sop.assignedCreatorId === currentUser.id || currentUser.role === 'ADMIN') && (
                                <button
                                  type="button"
                                  className="bg-[#f0f9ff] border border-[#0284c7] text-[#0369a1] rounded-[6px] px-2 py-[4px] cursor-pointer text-[12px] font-bold"
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
                                    className="bg-[#f0fdf4] border border-[#16a34a] text-[#15803d] rounded-[6px] px-2 py-[4px] cursor-pointer text-[12px] font-bold"
                                    onClick={() => handleApproveSop(sop)}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    className="bg-[#fff1f2] border border-[#e11d48] text-[#be123c] rounded-[6px] px-2 py-[4px] cursor-pointer text-[12px] font-bold"
                                    onClick={() => { setRejectingSop(sop); setRejectionReasonInput(''); }}
                                  >
                                    Reject
                                  </button>
                                </>
                              )
                            )}
                            <button
                              type="button"
                              className="bg-[#f1f5f9] border border-[#cbd5e1] text-[#334155] rounded-[6px] px-2 py-[4px] cursor-pointer text-[12px] font-semibold inline-flex items-center gap-1"
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
      )}

      {/* User Picker Modal for Maker Pool */}
      <UserPickerModal
        isOpen={showMakerPicker}
        title="Select Assigned Maker Pool"
        entityCode={formData.entityCode}
        targetRole="MAKER"
        selectedUserIds={formData.defaultMakerIds}
        onClose={() => setShowMakerPicker(false)}
        onConfirm={selectedIds => {
          setFormData(prev => ({ ...prev, defaultMakerIds: selectedIds }));
          setShowMakerPicker(false);
        }}
        onSelect={selectedIds => {
          setFormData(prev => ({ ...prev, defaultMakerIds: selectedIds }));
          setShowMakerPicker(false);
        }}
      />

      {/* User Picker Modal for Checker Pool */}
      <UserPickerModal
        isOpen={showCheckerPicker}
        title="Select Assigned Checker Pool"
        entityCode={formData.entityCode}
        targetRole="CHECKER"
        selectedUserIds={formData.defaultCheckerIds}
        onClose={() => setShowCheckerPicker(false)}
        onConfirm={selectedIds => {
          setFormData(prev => ({ ...prev, defaultCheckerIds: selectedIds }));
          setShowCheckerPicker(false);
        }}
        onSelect={selectedIds => {
          setFormData(prev => ({ ...prev, defaultCheckerIds: selectedIds }));
          setShowCheckerPicker(false);
        }}
      />

    </>
  );
}
