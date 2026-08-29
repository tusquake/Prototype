import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import EntityPills from '../components/EntityPills';
import CustomSelect from '../components/CustomSelect';
import UserPickerModal from '../components/UserPickerModal';
import TableSkeleton from '../components/TableSkeleton';
import Pagination from '../components/Pagination';
import SopDetailModal from '../components/SopDetailModal';
import ConfirmationModal from '../components/ConfirmationModal';
import Toast from '../components/Toast';
import { getSession } from '../auth/auth';
import { ENTITIES, getSops, createSop, updateSop, deleteSop, getUsers } from '../services/api';
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

const FREQUENCY_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'DAILY', label: 'Daily' },
];

const USER_NAME_MAP = {
  'usr-tushar': 'Tushar Seth',
  'usr-prayasa': 'Prayasa Sharma',
  'usr-vivek': 'Vivek Raj',
  'usr-mainak': 'Mainak Gupta',
  'usr-manoj': 'Manoj Agarwal',
};

const INITIAL_FORM = {
  sopCode: '',
  title: '',
  description: '',
  processCategory: 'Tax Compliance',
  entityCode: 'CK_INDIA',
  frequency: 'MONTHLY',
  dueDayOffset: 15,
  defaultMakerIds: ['usr-tushar', 'usr-prayasa'],
  defaultCheckerIds: ['usr-vivek', 'usr-mainak'],
};

const PAGE_SIZE = 10;

export default function Sops() {
  const [selected, setSelected] = useState(ENTITIES.map(e => e.id));
  const [sopList, setSopList] = useState([]);
  const [userMap, setUserMap] = useState(USER_NAME_MAP);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingSop, setEditingSop] = useState(null);
  const [viewingSop, setViewingSop] = useState(null);
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

  async function loadData() {
    setLoading(true);
    const data = await getSops(selected);
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
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [selected]);

  function openCreateModal() {
    setEditingSop(null);
    setFormData(INITIAL_FORM);
    setErrorMsg('');
    setShowModal(true);
  }

  function openEditModal(sop) {
    setEditingSop(sop);
    setFormData({
      sopCode: sop.code || sop.sopCode || '',
      title: sop.name || sop.title || '',
      description: sop.description || '',
      processCategory: sop.process || sop.processCategory || 'Tax Compliance',
      entityCode: sop.entityCode || 'CK_INDIA',
      frequency: sop.frequency || 'MONTHLY',
      dueDayOffset: sop.dueDay || sop.dueDayOffset || 15,
      defaultMakerIds: sop.defaultMakerIds || ['usr-tushar', 'usr-prayasa'],
      defaultCheckerIds: sop.defaultCheckerIds || ['usr-vivek', 'usr-mainak'],
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
      const payload = {
        ...formData,
        defaultMakerId: formData.defaultMakerIds[0] || 'usr-tushar',
        defaultCheckerId: formData.defaultCheckerIds[0] || 'usr-vivek',
        createdById: 'usr-mainak',
      };

      if (editingSop) {
        await updateSop(editingSop.sopId || editingSop.id || editingSop.code, payload);
        setSuccessMsg(`SOP "${formData.title}" updated successfully! Version incremented.`);
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

  const filtered = sopList.filter(s => selected.includes(s.entityCode));
  const paginatedSops = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className={styles.layout}>
      <Sidebar />
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

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a2b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Master Operating Procedures
              </span>
              {isAdmin && (
                <button className={styles.createBtn} onClick={openCreateModal}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Create SOP</span>
                </button>
              )}
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>CODE</th>
                    <th>NAME</th>
                    <th>PROCESS</th>
                    <th>ENTITY</th>
                    <th>FREQUENCY</th>
                    <th>DUE DAY</th>
                    <th>ASSIGNED MAKERS</th>
                    <th>ASSIGNED CHECKERS</th>
                    <th>VERSION</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton rows={4} columns={10} />
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={10} className={styles.empty}>No SOPs for selected entities.</td></tr>
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
                      <td>Day {sop.dueDay || sop.dueDayOffset}</td>
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
                      <td>v{sop.version || 1}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            title="View SOP Details"
                            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => setViewingSop(sop)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            View
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                title="Edit SOP"
                                style={{ background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.3)', color: '#2563eb', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                onClick={() => openEditModal(sop)}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Edit
                              </button>

                              <button
                                type="button"
                                title="Delete SOP"
                                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                onClick={() => setDeletingSop(sop)}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                Delete
                              </button>
                            </>
                          )}
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
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                itemLabel="SOPs"
              />
            )}
          </div>
        </div>
      </main>

      {/* SOP Details View Modal */}
      <SopDetailModal
        isOpen={!!viewingSop}
        sop={viewingSop}
        isAdmin={isAdmin}
        onClose={() => setViewingSop(null)}
        onEdit={sop => openEditModal(sop)}
        onDelete={sop => setDeletingSop(sop)}
      />

      {/* Confirmation Modal for SOP Deletion */}
      <ConfirmationModal
        isOpen={!!deletingSop}
        title="Delete Standard Operating Procedure"
        message={`Are you sure you want to delete SOP "${deletingSop?.name || deletingSop?.title || deletingSop?.code}"? This will archive the master procedure.`}
        confirmText="Delete SOP"
        confirmVariant="danger"
        submitting={deleting}
        onConfirm={confirmDeleteSop}
        onClose={() => setDeletingSop(null)}
      />

      {/* Create / Edit SOP Form Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h3>{editingSop ? 'Edit Standard Operating Procedure' : 'Create Standard Operating Procedure'}</h3>
                <p>{editingSop ? `Updating ${editingSop.code || editingSop.sopCode}` : 'Configure compliance schedule, assigned Maker pool, and Checker pool.'}</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className={styles.modalBody}>
                {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>SOP CODE *</label>
                    <input
                      type="text"
                      name="sopCode"
                      value={formData.sopCode}
                      onChange={handleInputChange}
                      placeholder="e.g. SOP-TAX-IN-005"
                      disabled={!!editingSop}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>PROCESS CATEGORY *</label>
                    <CustomSelect
                      name="processCategory"
                      value={formData.processCategory}
                      options={PROCESS_OPTIONS}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>SOP TITLE / NAME *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g. Quarterly GST Reconciliation & Filing"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>DESCRIPTION</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide operational steps, required documents, and compliance guidelines..."
                    rows={3}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>CORPORATE ENTITY *</label>
                    <CustomSelect
                      name="entityCode"
                      value={formData.entityCode}
                      options={ENTITY_OPTIONS}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>FREQUENCY *</label>
                    <CustomSelect
                      name="frequency"
                      value={formData.frequency}
                      options={FREQUENCY_OPTIONS}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>DUE DAY OFFSET *</label>
                    <input
                      type="number"
                      name="dueDayOffset"
                      value={formData.dueDayOffset}
                      onChange={handleInputChange}
                      min={1}
                      max={31}
                      required
                    />
                  </div>
                </div>

                {/* Maker & Checker Assignments */}
                <div className={styles.assignmentSection}>
                  <h4>Pool Assignments</h4>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <div className={styles.pickerHeader}>
                        <label>ASSIGNED MAKER POOL *</label>
                        <button
                          type="button"
                          className={styles.pickerBtn}
                          onClick={() => setShowMakerPicker(true)}
                        >
                          Select Makers ({formData.defaultMakerIds.length})
                        </button>
                      </div>
                      <div className={styles.poolPreview}>
                        {getNamesForIds(formData.defaultMakerIds)}
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <div className={styles.pickerHeader}>
                        <label>ASSIGNED CHECKER POOL *</label>
                        <button
                          type="button"
                          className={styles.pickerBtn}
                          onClick={() => setShowCheckerPicker(true)}
                        >
                          Select Checkers ({formData.defaultCheckerIds.length})
                        </button>
                      </div>
                      <div className={styles.poolPreview}>
                        {getNamesForIds(formData.defaultCheckerIds)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : (editingSop ? 'Update SOP' : 'Create & Schedule SOP')}
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
        onSelect={selectedIds => {
          setFormData(prev => ({ ...prev, defaultCheckerIds: selectedIds }));
          setShowCheckerPicker(false);
        }}
      />
    </div>
  );
}
