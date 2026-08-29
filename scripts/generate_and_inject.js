const fs = require('fs');
const path = require('path');

const ENTITIES = [
  { code: 'CK_INDIA', name: 'CK India' },
  { code: 'CK_US', name: 'CK US' },
  { code: 'CK_UK', name: 'CK UK' },
  { code: 'CK_AUSTRALIA', name: 'CK Australia' }
];

const SOPS = [
  { code: 'SOP-TAX-IN-001', title: 'Advance Tax Estimation & Filing', category: 'Tax Compliance', entity: 'CK_INDIA' },
  { code: 'SOP-PAY-IN-002', title: 'Monthly Payroll & Statutory PF Deposit', category: 'Payroll & Statutory', entity: 'CK_INDIA' },
  { code: 'SOP-GST-IN-003', title: 'GSTR-3B & GSTR-1 Monthly Return Filing', category: 'Tax Compliance', entity: 'CK_INDIA' },
  { code: 'SOP-TDS-IN-004', title: 'Quarterly TDS Return Filing Form 26Q', category: 'Tax Compliance', entity: 'CK_INDIA' },
  { code: 'SOP-TRS-US-001', title: 'US Treasury Wire Reconciliation', category: 'Treasury & Cash Management', entity: 'CK_US' },
  { code: 'SOP-AUD-US-002', title: 'US SOX Compliance & Financial Audit', category: 'Financial Reporting', entity: 'CK_US' },
  { code: 'SOP-PAY-US-003', title: 'US Employee W2 & State Tax Deposit', category: 'Payroll & Statutory', entity: 'CK_US' },
  { code: 'SOP-FIN-UK-001', title: 'UK Companies House Statutory Filing', category: 'Financial Reporting', entity: 'CK_UK' },
  { code: 'SOP-VAT-UK-002', title: 'UK HMRC Monthly VAT Return Filing', category: 'Tax Compliance', entity: 'CK_UK' },
  { code: 'SOP-AST-AU-001', title: 'Fixed Assets & Depreciation Schedule', category: 'Fixed Assets', entity: 'CK_AUSTRALIA' },
  { code: 'SOP-PAY-AU-002', title: 'Australia Payroll & Superannuation Guarantee', category: 'Payroll & Statutory', entity: 'CK_AUSTRALIA' }
];

const MAKERS = ['Tushar Seth', 'Prayasa Sharma', 'Vivek Raj'];
const CHECKERS = ['Mainak Gupta', 'Vivek Raj', 'Manoj Agarwal'];
const STATUSES = ['OPEN', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'];
const PERIODS = ['2026-M08', '2026-Q3', '2026-M07', '2026-D240', '2026-Y2026', '2026-Q2'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const baseDate = new Date(2026, 7, 28);
const generatedTasks = [];
const generatedAuditLogs = [];

for (let i = 1; i <= 60; i++) {
  const sop = getRandomItem(SOPS);
  const entity = ENTITIES.find(e => e.code === sop.entity);
  const recordNo = `TSK-202608-${String(i).padStart(3, '0')}`;
  const status = getRandomItem(STATUSES);

  let maker = getRandomItem(MAKERS);
  let checker = getRandomItem(CHECKERS);
  if (maker === checker) {
    checker = 'Manoj Agarwal';
  }

  let dayOffset;
  if (i <= 5) dayOffset = 0; // Today (Aug 28)
  else if (i <= 15) dayOffset = -getRandomInt(1, 6); // Last 7 Days
  else if (i <= 25) dayOffset = getRandomInt(-4, 2); // This Week
  else if (i <= 40) dayOffset = -getRandomInt(7, 27); // Earlier in August 2026
  else if (i <= 50) dayOffset = getRandomInt(1, 15); // Future August/September 2026
  else dayOffset = -getRandomInt(28, 60); // Earlier in July/June 2026

  const taskDueDate = new Date(baseDate);
  taskDueDate.setDate(baseDate.getDate() + dayOffset);

  const dueDateStr = taskDueDate.toISOString().split('T')[0];
  const daysOverdue = (dayOffset < 0 && (status === 'OPEN' || status === 'PENDING_REVIEW')) ? Math.abs(dayOffset) : 0;

  generatedTasks.push({
    taskId: `b${String(i).padStart(7, '0')}-0000-0000-0000-000000000000`,
    recordNo: recordNo,
    sopTitle: sop.title,
    processCategory: sop.category,
    periodKey: getRandomItem(PERIODS),
    entityCode: entity.code,
    entityName: entity.name,
    makerName: maker,
    checkerName: checker,
    assignedMakers: [maker, maker === 'Tushar Seth' ? 'Vivek Raj' : 'Tushar Seth'],
    assignedCheckers: [checker, checker === 'Mainak Gupta' ? 'Manoj Agarwal' : 'Mainak Gupta'],
    actualMaker: status !== 'OPEN' ? maker : null,
    actualChecker: (status === 'APPROVED' || status === 'REJECTED') ? checker : null,
    dueDate: dueDateStr,
    daysOverdue: daysOverdue,
    status: status
  });

  const action = status === 'PENDING_REVIEW' ? 'SUBMIT_TASK' : (status === 'APPROVED' ? 'APPROVE_TASK' : (status === 'REJECTED' ? 'REJECT_TASK' : 'SUBMIT_TASK'));
  const actor = (status === 'APPROVED' || status === 'REJECTED') ? checker : maker;
  const actorEmail = `${actor.toLowerCase().replace(' ', '.')}@cloudkaptan.com`;

  const logTimestamp = new Date(taskDueDate);
  logTimestamp.setHours(getRandomInt(9, 17), getRandomInt(10, 59), 0);

  generatedAuditLogs.push({
    auditId: 200 + i,
    timestamp: logTimestamp.toISOString(),
    correlationId: `corr-${getRandomInt(1000, 9999)}-${getRandomInt(10, 99)}`,
    actorId: `usr-${actor.toLowerCase().split(' ')[0]}`,
    actorName: actor,
    actorEmail: actorEmail,
    action: action,
    entityType: 'TASK',
    entityId: recordNo
  });
}

const apiFilePath = path.join(__dirname, '../frontend/src/services/api.js');
let apiContent = fs.readFileSync(apiFilePath, 'utf8');

// Replace MOCK_TASKS array
const sTasks = apiContent.indexOf('export const MOCK_TASKS = [');
const eTasks = apiContent.indexOf('export const MOCK_ORGANIZATION_USERS = [');

if (sTasks !== -1 && eTasks !== -1) {
  const newTasksStr = `export const MOCK_TASKS = ${JSON.stringify(generatedTasks, null, 2)};\n\n`;
  apiContent = apiContent.substring(0, sTasks) + newTasksStr + apiContent.substring(eTasks);
}

// Replace MOCK_AUDIT_LOGS array
const sAudit = apiContent.indexOf('export const MOCK_AUDIT_LOGS = [');
const eAudit = apiContent.indexOf('export async function fetchJson');

if (sAudit !== -1 && eAudit !== -1) {
  const newAuditStr = `export const MOCK_AUDIT_LOGS = ${JSON.stringify(generatedAuditLogs, null, 2)};\n\n`;
  apiContent = apiContent.substring(0, sAudit) + newAuditStr + apiContent.substring(eAudit);
}

fs.writeFileSync(apiFilePath, apiContent, 'utf8');
console.log(`Successfully generated and injected ${generatedTasks.length} tasks and ${generatedAuditLogs.length} audit logs into api.js!`);
