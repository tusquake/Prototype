import { useState, useEffect } from 'react';
import { getUserCategoryPermissions, grantCategoryPermission } from '../services/api';

const DEFAULT_USERS = [
  { id: 'usr-tushar-304', name: 'Tushar Seth', email: 'tushar@cloudkaptan.com', role: 'ADMIN' },
  { id: 'usr-vivek-108', name: 'Vivek Raj', email: 'vivek@cloudkaptan.com', role: 'NON_ADMIN' },
  { id: 'usr-mainak-215', name: 'Mainak Gupta', email: 'mainak@cloudkaptan.com', role: 'NON_ADMIN' },
  { id: 'usr-prayas-412', name: 'Prayasa Sharma', email: 'prayas@cloudkaptan.com', role: 'NON_ADMIN' },
  { id: 'usr-manoj-042', name: 'Manoj Kumar', email: 'manoj@cloudkaptan.com', role: 'NON_ADMIN' },
];

const PROCESS_CATEGORIES = [
  'Tax Compliance',
  'Treasury & Cash Management',
  'Financial Reporting',
  'Fixed Assets Management',
  'Payroll & Statutory Compliance',
  'Procure to Pay (P2P)',
  'Order to Cash (O2C)',
];

export default function UserCategoryPermissionsModal({ isOpen, onClose }) {
  const [selectedUserId, setSelectedUserId] = useState('usr-vivek-108');
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && selectedUserId) {
      loadUserPermissions(selectedUserId);
    }
  }, [isOpen, selectedUserId]);

  async function loadUserPermissions(userId) {
    setLoading(true);
    try {
      const data = await getUserCategoryPermissions(userId);
      const permMap = {};
      
      // Default empty structure
      PROCESS_CATEGORIES.forEach(cat => {
        permMap[cat] = {
          canCreateSop: false,
          canApproveSop: false,
          canMakeTask: false,
          canCheckTask: false,
        };
      });

      // Overlay existing DB records
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item.processCategory) {
            permMap[item.processCategory] = {
              canCreateSop: !!item.canCreateSop,
              canApproveSop: !!item.canApproveSop,
              canMakeTask: !!item.canMakeTask,
              canCheckTask: !!item.canCheckTask,
            };
          }
        });
      }

      setPermissions(permMap);
    } catch (err) {
      console.error('Failed to load category permissions:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleToggle(category, key) {
    setPermissions(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category]?.[key],
      },
    }));
  }

  async function handleSaveAll() {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const promises = PROCESS_CATEGORIES.map(category => {
        const catPerm = permissions[category] || {};
        return grantCategoryPermission({
          userId: selectedUserId,
          processCategory: category,
          canCreateSop: catPerm.canCreateSop,
          canApproveSop: catPerm.canApproveSop,
          canMakeTask: catPerm.canMakeTask,
          canCheckTask: catPerm.canCheckTask,
        });
      });

      await Promise.all(promises);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save category permissions:', err);
      alert('Failed to save permissions: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  const selectedUserObj = DEFAULT_USERS.find(u => u.id === selectedUserId);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
      <div style={{ background: '#ffffff', borderRadius: 12, width: '100%', maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        
        {/* Modal Header */}
        <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🛡️ Dynamic Category Access Manager</span>
              <span style={{ fontSize: 11, background: '#0284c7', color: '#ffffff', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>2-Tier RBAC</span>
            </h2>
            <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
              Configure operational capabilities per process category with automated Segregation of Duties (SoD) governance.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: 18, color: '#64748b', cursor: 'pointer', padding: 4 }}
          >
            ✕
          </button>
        </div>

        {/* User Picker Tabs / Dropdown */}
        <div style={{ padding: '14px 24px', background: '#ffffff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Select User:</label>
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: '#0f172a', background: '#f8fafc', cursor: 'pointer' }}
            >
              {DEFAULT_USERS.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role}) — {user.email}
                </option>
              ))}
            </select>
          </div>

          {selectedUserObj && (
            <div style={{ fontSize: 12, background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
              User ID: {selectedUserObj.id}
            </div>
          )}
        </div>

        {/* Category Permissions Matrix */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              Loading user category permissions...
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Process Category</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>✏️ Draft SOP</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>🛡️ Approve SOP</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>📋 Execute Task</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>✅ Verify Task</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>SoD Status</th>
                </tr>
              </thead>
              <tbody>
                {PROCESS_CATEGORIES.map(category => {
                  const catPerm = permissions[category] || {};
                  const isDualSopRights = catPerm.canCreateSop && catPerm.canApproveSop;
                  const isDualTaskRights = catPerm.canMakeTask && catPerm.canCheckTask;
                  const hasSoDWarning = isDualSopRights || isDualTaskRights;

                  return (
                    <tr key={category} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                        {category}
                      </td>

                      {/* Draft SOP */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!catPerm.canCreateSop}
                          onChange={() => handleToggle(category, 'canCreateSop')}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0284c7' }}
                        />
                      </td>

                      {/* Approve SOP */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!catPerm.canApproveSop}
                          onChange={() => handleToggle(category, 'canApproveSop')}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0284c7' }}
                        />
                      </td>

                      {/* Execute Task */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!catPerm.canMakeTask}
                          onChange={() => handleToggle(category, 'canMakeTask')}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0284c7' }}
                        />
                      </td>

                      {/* Verify Task */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!catPerm.canCheckTask}
                          onChange={() => handleToggle(category, 'canCheckTask')}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0284c7' }}
                        />
                      </td>

                      {/* SoD Badge */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {hasSoDWarning ? (
                          <span style={{ fontSize: 10, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            ⚠️ SoD Active: Self-approval Blocked
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, background: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: 10, fontWeight: 500 }}>
                            Standard Single Role
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {saveSuccess && (
              <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                ✓ Category permissions saved successfully!
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              style={{ padding: '8px 20px', background: '#0284c7', border: 'none', color: '#ffffff', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
            >
              {saving ? 'Saving Grants...' : 'Save Permissions'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
