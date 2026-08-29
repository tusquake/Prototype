const fs = require('fs');
const path = require('path');

const SOPS = [
  { id: '11111111-1111-1111-1111-111111111111', code: 'SOP-TAX-IN-001', title: 'Advance Tax Estimation & Filing', category: 'Tax Compliance', entity: 'CK_INDIA' },
  { id: '22222222-2222-2222-2222-222222222222', code: 'SOP-PAY-IN-002', title: 'Monthly Payroll & Statutory PF Deposit', category: 'Payroll & Statutory', entity: 'CK_INDIA' },
  { id: '33333333-3333-3333-3333-333333333333', code: 'SOP-GST-IN-003', title: 'GSTR-3B & GSTR-1 Monthly Return Filing', category: 'Tax Compliance', entity: 'CK_INDIA' },
  { id: '44444444-4444-4444-4444-444444444444', code: 'SOP-TRS-US-001', title: 'US Treasury Wire Reconciliation', category: 'Treasury & Cash Management', entity: 'CK_US' },
  { id: '55555555-5555-5555-5555-555555555555', code: 'SOP-FIN-UK-001', title: 'UK Companies House Statutory Filing', category: 'Financial Reporting', entity: 'CK_UK' }
];

const MAKERS = [
  { id: 'usr-tushar-304', name: 'Tushar Seth' },
  { id: 'usr-prayasa-410', name: 'Prayasa Sharma' },
  { id: 'usr-vivek-108', name: 'Vivek Raj' }
];

const CHECKERS = [
  { id: 'usr-mainak-215', name: 'Mainak Gupta' },
  { id: 'usr-vivek-108', name: 'Vivek Raj' },
  { id: 'usr-manoj-042', name: 'Manoj Agarwal' }
];

const STATUSES = ['OPEN', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const taskRows = [];
const auditRows = [];

// Seed existing unique (sop_id, period_key) combinations
const usedSopPeriods = new Set([
  '11111111-1111-1111-1111-111111111111:2026-Q3',
  '22222222-2222-2222-2222-222222222222:2026-M08',
  '33333333-3333-3333-3333-333333333333:2026-M08',
  '44444444-4444-4444-4444-444444444444:2026-D240',
  '55555555-5555-5555-5555-555555555555:2026-Y2026',
]);

for (let i = 1; i <= 55; i++) {
  const sop = SOPS[(i - 1) % SOPS.length];
  const recordNo = `TSK-202608-${String(i + 5).padStart(3, '0')}`;
  const taskUuid = `a${String(i + 5).padStart(7, '0')}-0000-0000-0000-000000000000`;
  const status = getRandomItem(STATUSES);

  let periodKey;
  let seq = 1;
  do {
    const yr = 2026 - Math.floor((i + seq) / 12);
    const m = ((i + seq) % 12) + 1;
    periodKey = `${yr}-P${String(m).padStart(2, '0')}${seq}`;
    seq++;
  } while (usedSopPeriods.has(`${sop.id}:${periodKey}`));

  usedSopPeriods.add(`${sop.id}:${periodKey}`);

  let maker = getRandomItem(MAKERS);
  let checker = getRandomItem(CHECKERS);
  if (maker.id === checker.id) {
    checker = CHECKERS.find(c => c.id === 'usr-manoj-042');
  }

  let dayOffset;
  if (i <= 5) dayOffset = 0;
  else if (i <= 15) dayOffset = -getRandomInt(1, 6);
  else if (i <= 25) dayOffset = getRandomInt(-4, 2);
  else if (i <= 40) dayOffset = -getRandomInt(7, 27);
  else dayOffset = getRandomInt(1, 15);

  const daySql = dayOffset >= 0 ? `CURRENT_DATE + ${dayOffset}` : `CURRENT_DATE - ${Math.abs(dayOffset)}`;

  taskRows.push(`    ('${taskUuid}', 0, '${recordNo}', '${sop.id}', '${periodKey}', '${sop.entity}', '${maker.id}', '${checker.id}', '${status}', ${daySql}, CURRENT_TIMESTAMP)`);

  const action = status === 'PENDING_REVIEW' ? 'SUBMIT_TASK' : (status === 'APPROVED' ? 'APPROVE_TASK' : (status === 'REJECTED' ? 'REJECT_TASK' : 'CREATE_SOP'));
  const actorId = (status === 'APPROVED' || status === 'REJECTED') ? checker.id : maker.id;
  const corrId = `corr-${getRandomInt(1000, 9999)}-${getRandomInt(10, 99)}`;

  auditRows.push(`    ('${actorId}', '${action}', 'TASK', '${recordNo}', '${corrId}', CURRENT_TIMESTAMP - INTERVAL '${Math.abs(dayOffset)}' DAY)`);
}

const v2Content = `-- Flyway Seed Data Migration V2: Initial Master SOPs & Compliance Tasks

INSERT INTO users (user_id, email, full_name, role, entity_code) VALUES
    ('usr-avisek-499', 'avisek.shaw@cloudkaptan.com', 'Avisek Shaw', 'CHECKER', 'CK_INDIA');

-- 1. Demo SOP Master Definitions
INSERT INTO sops (sop_id, sop_code, title, description, process_category, entity_code, frequency, due_day_offset, default_maker_id, default_checker_id, status, created_by, created_at)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'SOP-TAX-IN-001', 'Advance Tax Estimation & Filing', 'Quarterly calculation and deposit of advance income tax with CBDT portal.', 'Tax Compliance', 'CK_INDIA', 'QUARTERLY', 15, 'usr-tushar-304', 'usr-mainak-215', 'ACTIVE', 'usr-manoj-042', CURRENT_TIMESTAMP),
    ('22222222-2222-2222-2222-222222222222', 'SOP-PAY-IN-002', 'Monthly Payroll & Statutory PF Deposit', 'Processing monthly employee salaries, PF, ESI, and Professional Tax remittance.', 'Payroll & Statutory', 'CK_INDIA', 'MONTHLY', 10, 'usr-tushar-304', 'usr-vivek-108', 'ACTIVE', 'usr-manoj-042', CURRENT_TIMESTAMP),
    ('33333333-3333-3333-3333-333333333333', 'SOP-GST-IN-003', 'GSTR-3B & GSTR-1 Monthly Return Filing', 'Reconciliation of Input Tax Credit (ITC) with GSTR-2B and monthly GST return submission.', 'Tax Compliance', 'CK_INDIA', 'MONTHLY', 20, 'usr-prayasa-410', 'usr-vivek-108', 'ACTIVE', 'usr-manoj-042', CURRENT_TIMESTAMP),
    ('44444444-4444-4444-4444-444444444444', 'SOP-TRS-US-001', 'US Treasury Wire Reconciliation', 'Daily intercompany bank wire transfers and balance sheet cash sweep audit.', 'Treasury & Cash Management', 'CK_US', 'DAILY', 1, 'usr-tushar-304', 'usr-manoj-042', 'ACTIVE', 'usr-manoj-042', CURRENT_TIMESTAMP),
    ('55555555-5555-5555-5555-555555555555', 'SOP-FIN-UK-001', 'UK Companies House Statutory Filing', 'Annual financial statements audit and Companies House annual confirmation statement.', 'Financial Reporting', 'CK_UK', 'ANNUAL', 28, 'usr-tushar-304', 'usr-mainak-215', 'ACTIVE', 'usr-manoj-042', CURRENT_TIMESTAMP);

-- 2. Demo Task Instances (60 Records)
INSERT INTO tasks (task_id, version, record_no, sop_id, period_key, entity_code, maker_id, checker_id, status, due_date, created_at)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 0, 'TSK-202608-001', '11111111-1111-1111-1111-111111111111', '2026-Q3', 'CK_INDIA', 'usr-tushar-304', 'usr-mainak-215', 'PENDING_REVIEW', CURRENT_DATE + 5, CURRENT_TIMESTAMP),
    ('a2222222-2222-2222-2222-222222222222', 0, 'TSK-202608-002', '22222222-2222-2222-2222-222222222222', '2026-M08', 'CK_INDIA', 'usr-tushar-304', 'usr-vivek-108', 'OPEN', CURRENT_DATE + 2, CURRENT_TIMESTAMP),
    ('a3333333-3333-3333-3333-333333333333', 0, 'TSK-202608-003', '33333333-3333-3333-3333-333333333333', '2026-M08', 'CK_INDIA', 'usr-prayasa-410', 'usr-vivek-108', 'APPROVED', CURRENT_DATE - 3, CURRENT_TIMESTAMP),
    ('a4444444-4444-4444-4444-444444444444', 0, 'TSK-202608-004', '44444444-4444-4444-4444-444444444444', '2026-D240', 'CK_US', 'usr-tushar-304', 'usr-manoj-042', 'PENDING_REVIEW', CURRENT_DATE + 1, CURRENT_TIMESTAMP),
    ('a5555555-5555-5555-5555-555555555555', 0, 'TSK-202608-005', '55555555-5555-5555-5555-555555555555', '2026-Y2026', 'CK_UK', 'usr-tushar-304', 'usr-mainak-215', 'OPEN', CURRENT_DATE + 14, CURRENT_TIMESTAMP),
${taskRows.join(',\n')};

-- 3. Demo Immutable Audit Logs (60 Records)
INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, correlation_id, timestamp)
VALUES
    ('usr-manoj-042', 'CREATE_SOP', 'SOP', 'SOP-TAX-IN-001', 'corr-8a12-9f01', CURRENT_TIMESTAMP - INTERVAL '10' DAY),
    ('usr-tushar-304', 'SUBMIT_TASK', 'TASK', 'TSK-202608-001', 'corr-4b31-1c02', CURRENT_TIMESTAMP - INTERVAL '5' DAY),
    ('usr-prayasa-410', 'SUBMIT_TASK', 'TASK', 'TSK-202608-003', 'corr-7c89-2d03', CURRENT_TIMESTAMP - INTERVAL '4' DAY),
    ('usr-vivek-108', 'APPROVE_TASK', 'TASK', 'TSK-202608-003', 'corr-9d01-3e04', CURRENT_TIMESTAMP - INTERVAL '3' DAY),
    ('usr-tushar-304', 'SUBMIT_TASK', 'TASK', 'TSK-202608-004', 'corr-1e23-4f05', CURRENT_TIMESTAMP - INTERVAL '1' DAY),
${auditRows.join(',\n')};
`;

const v2FilePath = path.join(__dirname, '../backend/src/main/resources/db/migration/common/V2__seed_dummy_sops_and_tasks.sql');
fs.writeFileSync(v2FilePath, v2Content, 'utf8');
console.log('Successfully updated V2__seed_dummy_sops_and_tasks.sql with 60 valid unique rows!');
