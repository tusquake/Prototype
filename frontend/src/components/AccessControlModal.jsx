import { useState, useEffect } from "react";
import AccessControlForm from "./AccessControlForm";
import { getAccessControlActivityLogs } from "../services/api";
import UserPickerModal from "./UserPickerModal";

export default function AccessControlModal({ activeCategory, onClose, categoryAssignments, getUserNames, handleSaveAccess }) {
  const [activeModalTab, setActiveModalTab] = useState('CONFIGURE');
  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [categoryLogs, setCategoryLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [saving, setSaving] = useState(false)
  const [pickerConfig, setPickerConfig] = useState({
    type: 'creators', // 'creators' | 'approvers' | 'makers' | 'checkers'
    title: 'Select Users',
    selectedIds: [],
  });

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


  const [creators, setCreators] = useState(categoryAssignments[activeCategory.categoryCode]?.creatorUserIds || [])
  const [approvers, setApprovers] = useState(categoryAssignments[activeCategory.categoryCode]?.approverUserIds || [])
  const [makers, setMakers] = useState(categoryAssignments[activeCategory.categoryCode]?.makerUserIds || [])
  const [checkers, setCheckers] = useState(categoryAssignments[activeCategory.categoryCode]?.checkerUserIds || [])

  const dualSopUsers = creators.filter(id => approvers.includes(id));

  const dualTaskUsers = makers.filter(id => checkers.includes(id));
  const hasSoDWarning = dualSopUsers.length > 0 || dualTaskUsers.length > 0;

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

  const renderLogDetails = (details) => {
    if (!details) return null;

    // Check if details string is an access control update
    if (details.startsWith("Updated access permissions:")) {
      const rawContent = details.replace("Updated access permissions:", "").trim();
      // Split segments separated by semicolons (e.g. "Added Task Submitter(s): ...")

      const segments = rawContent.split(";").map((s) => s.trim()).filter(Boolean);

      return (
        <div className="mt-1 flex flex-col gap-2">
          <span className="text-[12px] font-medium text-slate-500">Updated access permissions:</span>
          <div className="flex flex-col gap-2">
            {segments.map((

              segment, idx) => {
              const [label, usersString] = segment.split(":");

              const users = usersString ? usersString.split(",").map((u) => u.trim()) : [];

              return (
                <div key={idx} className="flex flex-wrap items-center gap-1.5 text-[12px]">
                  <span className="font-medium text-slate-700">{label}:</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {users.map((

                      user, uIdx) => (
                      <span
                        key={uIdx}
                        className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-700 border border-slate-200"
                      >
                        {user}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Default fallback for other detail string formats
    return <div className="text-[13px] leading-normal text-slate-800">{details}</div>;
  };

  useEffect(() => {
    if (activeCategory && activeModalTab === 'ACTIVITY') {

      const code = activeCategory.categoryCode || activeCategory.categoryName;
      fetchCategoryLogs(code);
    }
  }, [activeCategory, activeModalTab]);



  return (
    <>
      <div className="fixed inset-0 bg-[#091124]/65 backdrop-blur-sm flex items-center justify-center z-[999] p-6" onClick={onClose}>
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
              onClick={onClose}
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

                <AccessControlForm
                  activeCategory={activeCategory}
                  initialAssignments={categoryAssignments[activeCategory.categoryCode]}
                  getUserNames={getUserNames}
                  handleOpenUserPicker={handleOpenUserPicker}
                  onSave={(updated, catCode) => handleSaveAccess(updated, catCode)}
                  creatorsList={creators}
                  approversList={approvers}
                  makersList={makers}
                  checkersList={checkers}
                />

              </>
            ) : (
              /* TAB 2: ACCESS CONTROL ACTIVITY LOG TIMELINE */
              <div className="max-h-[60vh] p-6 pt-0">
                {loadingLogs ? (
                  <div className="p-10 text-center text-text-muted text-[13px]">
                    Loading category access audit history...
                  </div>
                ) : categoryLogs.length === 0 ? (
                  <div className="p-10 text-center text-text-muted text-[13px]">
                    No access control modifications logged for this category yet.
                  </div>
                ) : (
                  <div className="relative flex flex-col gap-4">
                    {categoryLogs.map((log, idx) => {
                      const isNotLast = idx !== categoryLogs.length - 1;
                      return (
                        <div
                          key={log.id}
                          className={`relative flex gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${isNotLast ? "after:absolute after:left-[27px] after:top-[48px] after:bottom-[-18px] after:w-[2px] after:bg-slate-300 after:z-0" : ""
                            }`}
                        >
                          <div className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-blue-50 text-blue-600 border-blue-300`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                          </div>

                          <div className="flex flex-1 flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold bg-[#e0f2fe] text-[#0369a1] px-2 py-[2px] rounded-[6px] uppercase">
                                {log.action || 'ACCESS_CONTROL_UPDATED'}
                              </span>
                              <span className="text-[11px] text-text-muted">
                                {log?.timestamp ? new Date(log?.timestamp).toISOString().replace('T', ' ').substring(0, 19) + ' UTC' : 'Just now'}
                              </span>
                            </div>

                            <div className="text-[12.5px] text-slate-600">
                              <span >Updated by: <strong className="font-semibold text-slate-700"> {log.actorName || log.actorId} </strong> </span>
                            </div>

                            {renderLogDetails(log?.details)}


                          </div>

                        </div>
                      )
                    }
                    )}
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
              onClick={onClose}
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

      <UserPickerModal
        isOpen={pickerModalOpen}
        title={pickerConfig.title}
        selectedUserIds={pickerConfig.selectedIds}
        onClose={() => setPickerModalOpen(false)}
        onConfirm={handleConfirmUserPicker}
      />
    </>
  )
}