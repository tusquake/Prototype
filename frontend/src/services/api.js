const API_BASE = '/finsop/v1';

export const ENTITIES = [
  { id: 'CK_INDIA', label: 'CK India' },
  { id: 'CK_US', label: 'CK US' },
  { id: 'CK_UK', label: 'CK UK' },
  { id: 'CK_AUSTRALIA', label: 'CK Australia' },
];

export const MOCK_SOPS = [
  {
    sopId: '11111111-1111-1111-1111-111111111111',
    sopCode: 'SOP-TAX-IN-001',
    title: 'Advance Tax Estimation & Filing',
    processCategory: 'Tax Compliance',
    entityCode: 'CK_INDIA',
    entityName: 'CK India',
    frequency: 'QUARTERLY',
    dueDayOffset: 15,
    defaultMakerName: 'Tushar Seth',
    defaultCheckerName: 'Mainak Gupta',
    defaultMakerNames: ['Tushar Seth', 'Vivek Raj'],
    defaultCheckerNames: ['Mainak Gupta', 'Manoj Agarwal'],
    version: 1,
  },
  {
    sopId: '22222222-2222-2222-2222-222222222222',
    sopCode: 'SOP-PAY-IN-002',
    title: 'Monthly Payroll & Statutory PF Deposit',
    processCategory: 'Payroll & Statutory',
    entityCode: 'CK_INDIA',
    entityName: 'CK India',
    frequency: 'MONTHLY',
    dueDayOffset: 10,
    defaultMakerName: 'Tushar Seth',
    defaultCheckerName: 'Vivek Raj',
    defaultMakerNames: ['Tushar Seth', 'Prayasa Sharma'],
    defaultCheckerNames: ['Vivek Raj', 'Mainak Gupta'],
    version: 1,
  },
  {
    sopId: '33333333-3333-3333-3333-333333333333',
    sopCode: 'SOP-GST-IN-003',
    title: 'GSTR-3B & GSTR-1 Monthly Return Filing',
    processCategory: 'Tax Compliance',
    entityCode: 'CK_INDIA',
    entityName: 'CK India',
    frequency: 'MONTHLY',
    dueDayOffset: 20,
    defaultMakerName: 'Prayasa Sharma',
    defaultCheckerName: 'Vivek Raj',
    defaultMakerNames: ['Prayasa Sharma', 'Tushar Seth'],
    defaultCheckerNames: ['Vivek Raj', 'Manoj Agarwal'],
    version: 1,
  },
  {
    sopId: '44444444-4444-4444-4444-444444444444',
    sopCode: 'SOP-TRS-US-001',
    title: 'US Treasury Wire Reconciliation',
    processCategory: 'Treasury & Cash Management',
    entityCode: 'CK_US',
    entityName: 'CK US',
    frequency: 'DAILY',
    dueDayOffset: 1,
    defaultMakerName: 'Tushar Seth',
    defaultCheckerName: 'Manoj Agarwal',
    defaultMakerNames: ['Tushar Seth', 'Vivek Raj'],
    defaultCheckerNames: ['Manoj Agarwal', 'Mainak Gupta'],
    version: 1,
  },
  {
    sopId: '55555555-5555-5555-5555-555555555555',
    sopCode: 'SOP-FIN-UK-001',
    title: 'UK Companies House Statutory Filing',
    processCategory: 'Financial Reporting',
    entityCode: 'CK_UK',
    entityName: 'CK UK',
    frequency: 'ANNUAL',
    dueDayOffset: 28,
    defaultMakerName: 'Tushar Seth',
    defaultCheckerName: 'Mainak Gupta',
    defaultMakerNames: ['Tushar Seth'],
    defaultCheckerNames: ['Mainak Gupta', 'Manoj Agarwal'],
    version: 1,
  },
];

export const MOCK_TASKS = [
  {
    "taskId": "b0000001-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-001",
    "sopTitle": "GSTR-3B & GSTR-1 Monthly Return Filing",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-M08",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Prayasa Sharma",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Prayasa Sharma",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Prayasa Sharma",
    "actualChecker": "Manoj Agarwal",
    "dueDate": "2026-08-27",
    "daysOverdue": 0,
    "status": "APPROVED"
  },
  {
    "taskId": "b0000002-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-002",
    "sopTitle": "Advance Tax Estimation & Filing",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-M08",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Tushar Seth",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Tushar Seth",
    "actualChecker": null,
    "dueDate": "2026-08-27",
    "daysOverdue": 0,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000003-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-003",
    "sopTitle": "Australia Payroll & Superannuation Guarantee",
    "processCategory": "Payroll & Statutory",
    "periodKey": "2026-M08",
    "entityCode": "CK_AUSTRALIA",
    "entityName": "CK Australia",
    "makerName": "Vivek Raj",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": null,
    "actualChecker": null,
    "dueDate": "2026-08-27",
    "daysOverdue": 0,
    "status": "OPEN"
  },
  {
    "taskId": "b0000004-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-004",
    "sopTitle": "Quarterly TDS Return Filing Form 26Q",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-Y2026",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Tushar Seth",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Tushar Seth",
    "actualChecker": null,
    "dueDate": "2026-08-27",
    "daysOverdue": 0,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000005-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-005",
    "sopTitle": "Advance Tax Estimation & Filing",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-Q2",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Vivek Raj",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": null,
    "actualChecker": null,
    "dueDate": "2026-08-27",
    "daysOverdue": 0,
    "status": "OPEN"
  },
  {
    "taskId": "b0000006-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-006",
    "sopTitle": "UK Companies House Statutory Filing",
    "processCategory": "Financial Reporting",
    "periodKey": "2026-Y2026",
    "entityCode": "CK_UK",
    "entityName": "CK UK",
    "makerName": "Prayasa Sharma",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Prayasa Sharma",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Prayasa Sharma",
    "actualChecker": "Manoj Agarwal",
    "dueDate": "2026-08-23",
    "daysOverdue": 0,
    "status": "REJECTED"
  },
  {
    "taskId": "b0000007-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-007",
    "sopTitle": "GSTR-3B & GSTR-1 Monthly Return Filing",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-Q2",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Tushar Seth",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Tushar Seth",
    "actualChecker": null,
    "dueDate": "2026-08-22",
    "daysOverdue": 5,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000008-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-008",
    "sopTitle": "US Employee W2 & State Tax Deposit",
    "processCategory": "Payroll & Statutory",
    "periodKey": "2026-M07",
    "entityCode": "CK_US",
    "entityName": "CK US",
    "makerName": "Prayasa Sharma",
    "checkerName": "Mainak Gupta",
    "assignedMakers": [
      "Prayasa Sharma",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Mainak Gupta",
      "Manoj Agarwal"
    ],
    "actualMaker": "Prayasa Sharma",
    "actualChecker": "Mainak Gupta",
    "dueDate": "2026-08-21",
    "daysOverdue": 0,
    "status": "REJECTED"
  },
  {
    "taskId": "b0000009-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-009",
    "sopTitle": "GSTR-3B & GSTR-1 Monthly Return Filing",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-Y2026",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Prayasa Sharma",
    "checkerName": "Vivek Raj",
    "assignedMakers": [
      "Prayasa Sharma",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Vivek Raj",
      "Mainak Gupta"
    ],
    "actualMaker": null,
    "actualChecker": null,
    "dueDate": "2026-08-26",
    "daysOverdue": 1,
    "status": "OPEN"
  },
  {
    "taskId": "b0000010-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-010",
    "sopTitle": "Quarterly TDS Return Filing Form 26Q",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-Q2",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Vivek Raj",
    "checkerName": "Mainak Gupta",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Mainak Gupta",
      "Manoj Agarwal"
    ],
    "actualMaker": null,
    "actualChecker": null,
    "dueDate": "2026-08-23",
    "daysOverdue": 4,
    "status": "OPEN"
  },
  {
    "taskId": "b0000011-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-011",
    "sopTitle": "Monthly Payroll & Statutory PF Deposit",
    "processCategory": "Payroll & Statutory",
    "periodKey": "2026-M07",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Prayasa Sharma",
    "checkerName": "Mainak Gupta",
    "assignedMakers": [
      "Prayasa Sharma",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Mainak Gupta",
      "Manoj Agarwal"
    ],
    "actualMaker": null,
    "actualChecker": null,
    "dueDate": "2026-08-23",
    "daysOverdue": 4,
    "status": "OPEN"
  },
  {
    "taskId": "b0000012-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-012",
    "sopTitle": "Fixed Assets & Depreciation Schedule",
    "processCategory": "Fixed Assets",
    "periodKey": "2026-M07",
    "entityCode": "CK_AUSTRALIA",
    "entityName": "CK Australia",
    "makerName": "Prayasa Sharma",
    "checkerName": "Mainak Gupta",
    "assignedMakers": [
      "Prayasa Sharma",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Mainak Gupta",
      "Manoj Agarwal"
    ],
    "actualMaker": "Prayasa Sharma",
    "actualChecker": "Mainak Gupta",
    "dueDate": "2026-08-24",
    "daysOverdue": 0,
    "status": "REJECTED"
  },
  {
    "taskId": "b0000013-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-013",
    "sopTitle": "US Treasury Wire Reconciliation",
    "processCategory": "Treasury & Cash Management",
    "periodKey": "2026-Q2",
    "entityCode": "CK_US",
    "entityName": "CK US",
    "makerName": "Vivek Raj",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": "Manoj Agarwal",
    "dueDate": "2026-08-23",
    "daysOverdue": 0,
    "status": "APPROVED"
  },
  {
    "taskId": "b0000014-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-014",
    "sopTitle": "Quarterly TDS Return Filing Form 26Q",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-Y2026",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Prayasa Sharma",
    "checkerName": "Vivek Raj",
    "assignedMakers": [
      "Prayasa Sharma",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Vivek Raj",
      "Mainak Gupta"
    ],
    "actualMaker": "Prayasa Sharma",
    "actualChecker": "Vivek Raj",
    "dueDate": "2026-08-25",
    "daysOverdue": 0,
    "status": "APPROVED"
  },
  {
    "taskId": "b0000015-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-015",
    "sopTitle": "US SOX Compliance & Financial Audit",
    "processCategory": "Financial Reporting",
    "periodKey": "2026-Q2",
    "entityCode": "CK_US",
    "entityName": "CK US",
    "makerName": "Vivek Raj",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": "Manoj Agarwal",
    "dueDate": "2026-08-21",
    "daysOverdue": 0,
    "status": "APPROVED"
  },
  {
    "taskId": "b0000016-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-016",
    "sopTitle": "Quarterly TDS Return Filing Form 26Q",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-Q2",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Vivek Raj",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": "Manoj Agarwal",
    "dueDate": "2026-08-25",
    "daysOverdue": 0,
    "status": "APPROVED"
  },
  {
    "taskId": "b0000017-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-017",
    "sopTitle": "Monthly Payroll & Statutory PF Deposit",
    "processCategory": "Payroll & Statutory",
    "periodKey": "2026-Q3",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Vivek Raj",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": null,
    "dueDate": "2026-08-24",
    "daysOverdue": 3,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000018-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-018",
    "sopTitle": "US SOX Compliance & Financial Audit",
    "processCategory": "Financial Reporting",
    "periodKey": "2026-Y2026",
    "entityCode": "CK_US",
    "entityName": "CK US",
    "makerName": "Vivek Raj",
    "checkerName": "Mainak Gupta",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Mainak Gupta",
      "Manoj Agarwal"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": null,
    "dueDate": "2026-08-29",
    "daysOverdue": 0,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000019-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-019",
    "sopTitle": "Quarterly TDS Return Filing Form 26Q",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-Q3",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Tushar Seth",
    "checkerName": "Mainak Gupta",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Mainak Gupta",
      "Manoj Agarwal"
    ],
    "actualMaker": "Tushar Seth",
    "actualChecker": "Mainak Gupta",
    "dueDate": "2026-08-29",
    "daysOverdue": 0,
    "status": "APPROVED"
  },
  {
    "taskId": "b0000020-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-020",
    "sopTitle": "US SOX Compliance & Financial Audit",
    "processCategory": "Financial Reporting",
    "periodKey": "2026-M08",
    "entityCode": "CK_US",
    "entityName": "CK US",
    "makerName": "Tushar Seth",
    "checkerName": "Vivek Raj",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Vivek Raj",
      "Mainak Gupta"
    ],
    "actualMaker": "Tushar Seth",
    "actualChecker": null,
    "dueDate": "2026-08-26",
    "daysOverdue": 1,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000021-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-021",
    "sopTitle": "Advance Tax Estimation & Filing",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-D240",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Prayasa Sharma",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Prayasa Sharma",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Prayasa Sharma",
    "actualChecker": "Manoj Agarwal",
    "dueDate": "2026-08-26",
    "daysOverdue": 0,
    "status": "APPROVED"
  },
  {
    "taskId": "b0000022-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-022",
    "sopTitle": "UK HMRC Monthly VAT Return Filing",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-Q2",
    "entityCode": "CK_UK",
    "entityName": "CK UK",
    "makerName": "Vivek Raj",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": null,
    "dueDate": "2026-08-25",
    "daysOverdue": 2,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000023-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-023",
    "sopTitle": "US Employee W2 & State Tax Deposit",
    "processCategory": "Payroll & Statutory",
    "periodKey": "2026-Q2",
    "entityCode": "CK_US",
    "entityName": "CK US",
    "makerName": "Tushar Seth",
    "checkerName": "Vivek Raj",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Vivek Raj",
      "Mainak Gupta"
    ],
    "actualMaker": "Tushar Seth",
    "actualChecker": "Vivek Raj",
    "dueDate": "2026-08-27",
    "daysOverdue": 0,
    "status": "REJECTED"
  },
  {
    "taskId": "b0000024-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-024",
    "sopTitle": "US Treasury Wire Reconciliation",
    "processCategory": "Treasury & Cash Management",
    "periodKey": "2026-Q3",
    "entityCode": "CK_US",
    "entityName": "CK US",
    "makerName": "Prayasa Sharma",
    "checkerName": "Mainak Gupta",
    "assignedMakers": [
      "Prayasa Sharma",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Mainak Gupta",
      "Manoj Agarwal"
    ],
    "actualMaker": "Prayasa Sharma",
    "actualChecker": "Mainak Gupta",
    "dueDate": "2026-08-27",
    "daysOverdue": 0,
    "status": "APPROVED"
  },
  {
    "taskId": "b0000025-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-025",
    "sopTitle": "Fixed Assets & Depreciation Schedule",
    "processCategory": "Fixed Assets",
    "periodKey": "2026-Q2",
    "entityCode": "CK_AUSTRALIA",
    "entityName": "CK Australia",
    "makerName": "Tushar Seth",
    "checkerName": "Mainak Gupta",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Mainak Gupta",
      "Manoj Agarwal"
    ],
    "actualMaker": null,
    "actualChecker": null,
    "dueDate": "2026-08-23",
    "daysOverdue": 4,
    "status": "OPEN"
  },
  {
    "taskId": "b0000026-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-026",
    "sopTitle": "UK Companies House Statutory Filing",
    "processCategory": "Financial Reporting",
    "periodKey": "2026-M08",
    "entityCode": "CK_UK",
    "entityName": "CK UK",
    "makerName": "Vivek Raj",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": "Manoj Agarwal",
    "dueDate": "2026-08-10",
    "daysOverdue": 0,
    "status": "REJECTED"
  },
  {
    "taskId": "b0000027-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-027",
    "sopTitle": "UK Companies House Statutory Filing",
    "processCategory": "Financial Reporting",
    "periodKey": "2026-M08",
    "entityCode": "CK_UK",
    "entityName": "CK UK",
    "makerName": "Prayasa Sharma",
    "checkerName": "Vivek Raj",
    "assignedMakers": [
      "Prayasa Sharma",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Vivek Raj",
      "Mainak Gupta"
    ],
    "actualMaker": "Prayasa Sharma",
    "actualChecker": "Vivek Raj",
    "dueDate": "2026-08-04",
    "daysOverdue": 0,
    "status": "REJECTED"
  },
  {
    "taskId": "b0000028-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-028",
    "sopTitle": "US Employee W2 & State Tax Deposit",
    "processCategory": "Payroll & Statutory",
    "periodKey": "2026-Q2",
    "entityCode": "CK_US",
    "entityName": "CK US",
    "makerName": "Tushar Seth",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Tushar Seth",
    "actualChecker": "Manoj Agarwal",
    "dueDate": "2026-08-01",
    "daysOverdue": 0,
    "status": "APPROVED"
  },
  {
    "taskId": "b0000029-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-029",
    "sopTitle": "Quarterly TDS Return Filing Form 26Q",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-Q3",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Vivek Raj",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": null,
    "dueDate": "2026-08-06",
    "daysOverdue": 21,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000030-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-030",
    "sopTitle": "Australia Payroll & Superannuation Guarantee",
    "processCategory": "Payroll & Statutory",
    "periodKey": "2026-Q2",
    "entityCode": "CK_AUSTRALIA",
    "entityName": "CK Australia",
    "makerName": "Vivek Raj",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": null,
    "dueDate": "2026-08-05",
    "daysOverdue": 22,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000031-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-031",
    "sopTitle": "GSTR-3B & GSTR-1 Monthly Return Filing",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-Q2",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Prayasa Sharma",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Prayasa Sharma",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Prayasa Sharma",
    "actualChecker": "Manoj Agarwal",
    "dueDate": "2026-08-09",
    "daysOverdue": 0,
    "status": "APPROVED"
  },
  {
    "taskId": "b0000032-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-032",
    "sopTitle": "UK HMRC Monthly VAT Return Filing",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-M07",
    "entityCode": "CK_UK",
    "entityName": "CK UK",
    "makerName": "Vivek Raj",
    "checkerName": "Mainak Gupta",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Mainak Gupta",
      "Manoj Agarwal"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": "Mainak Gupta",
    "dueDate": "2026-08-06",
    "daysOverdue": 0,
    "status": "APPROVED"
  },
  {
    "taskId": "b0000033-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-033",
    "sopTitle": "Fixed Assets & Depreciation Schedule",
    "processCategory": "Fixed Assets",
    "periodKey": "2026-M08",
    "entityCode": "CK_AUSTRALIA",
    "entityName": "CK Australia",
    "makerName": "Vivek Raj",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": null,
    "actualChecker": null,
    "dueDate": "2026-08-06",
    "daysOverdue": 21,
    "status": "OPEN"
  },
  {
    "taskId": "b0000034-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-034",
    "sopTitle": "GSTR-3B & GSTR-1 Monthly Return Filing",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-Q3",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Tushar Seth",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": null,
    "actualChecker": null,
    "dueDate": "2026-08-11",
    "daysOverdue": 16,
    "status": "OPEN"
  },
  {
    "taskId": "b0000035-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-035",
    "sopTitle": "Quarterly TDS Return Filing Form 26Q",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-M08",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Tushar Seth",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Tushar Seth",
    "actualChecker": "Manoj Agarwal",
    "dueDate": "2026-08-18",
    "daysOverdue": 0,
    "status": "REJECTED"
  },
  {
    "taskId": "b0000036-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-036",
    "sopTitle": "Australia Payroll & Superannuation Guarantee",
    "processCategory": "Payroll & Statutory",
    "periodKey": "2026-M08",
    "entityCode": "CK_AUSTRALIA",
    "entityName": "CK Australia",
    "makerName": "Prayasa Sharma",
    "checkerName": "Vivek Raj",
    "assignedMakers": [
      "Prayasa Sharma",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Vivek Raj",
      "Mainak Gupta"
    ],
    "actualMaker": null,
    "actualChecker": null,
    "dueDate": "2026-08-18",
    "daysOverdue": 9,
    "status": "OPEN"
  },
  {
    "taskId": "b0000037-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-037",
    "sopTitle": "GSTR-3B & GSTR-1 Monthly Return Filing",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-D240",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Tushar Seth",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": null,
    "actualChecker": null,
    "dueDate": "2026-08-17",
    "daysOverdue": 10,
    "status": "OPEN"
  },
  {
    "taskId": "b0000038-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-038",
    "sopTitle": "Advance Tax Estimation & Filing",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-D240",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Vivek Raj",
    "checkerName": "Mainak Gupta",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Mainak Gupta",
      "Manoj Agarwal"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": "Mainak Gupta",
    "dueDate": "2026-08-14",
    "daysOverdue": 0,
    "status": "APPROVED"
  },
  {
    "taskId": "b0000039-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-039",
    "sopTitle": "Quarterly TDS Return Filing Form 26Q",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-Q2",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Vivek Raj",
    "checkerName": "Mainak Gupta",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Mainak Gupta",
      "Manoj Agarwal"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": "Mainak Gupta",
    "dueDate": "2026-08-20",
    "daysOverdue": 0,
    "status": "APPROVED"
  },
  {
    "taskId": "b0000040-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-040",
    "sopTitle": "Fixed Assets & Depreciation Schedule",
    "processCategory": "Fixed Assets",
    "periodKey": "2026-Y2026",
    "entityCode": "CK_AUSTRALIA",
    "entityName": "CK Australia",
    "makerName": "Prayasa Sharma",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Prayasa Sharma",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": null,
    "actualChecker": null,
    "dueDate": "2026-08-16",
    "daysOverdue": 11,
    "status": "OPEN"
  },
  {
    "taskId": "b0000041-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-041",
    "sopTitle": "US Employee W2 & State Tax Deposit",
    "processCategory": "Payroll & Statutory",
    "periodKey": "2026-Q2",
    "entityCode": "CK_US",
    "entityName": "CK US",
    "makerName": "Prayasa Sharma",
    "checkerName": "Vivek Raj",
    "assignedMakers": [
      "Prayasa Sharma",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Vivek Raj",
      "Mainak Gupta"
    ],
    "actualMaker": "Prayasa Sharma",
    "actualChecker": null,
    "dueDate": "2026-08-28",
    "daysOverdue": 0,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000042-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-042",
    "sopTitle": "UK Companies House Statutory Filing",
    "processCategory": "Financial Reporting",
    "periodKey": "2026-Y2026",
    "entityCode": "CK_UK",
    "entityName": "CK UK",
    "makerName": "Tushar Seth",
    "checkerName": "Vivek Raj",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Vivek Raj",
      "Mainak Gupta"
    ],
    "actualMaker": "Tushar Seth",
    "actualChecker": null,
    "dueDate": "2026-08-28",
    "daysOverdue": 0,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000043-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-043",
    "sopTitle": "Australia Payroll & Superannuation Guarantee",
    "processCategory": "Payroll & Statutory",
    "periodKey": "2026-M08",
    "entityCode": "CK_AUSTRALIA",
    "entityName": "CK Australia",
    "makerName": "Tushar Seth",
    "checkerName": "Vivek Raj",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Vivek Raj",
      "Mainak Gupta"
    ],
    "actualMaker": "Tushar Seth",
    "actualChecker": null,
    "dueDate": "2026-09-11",
    "daysOverdue": 0,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000044-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-044",
    "sopTitle": "Quarterly TDS Return Filing Form 26Q",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-Q3",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Vivek Raj",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": null,
    "dueDate": "2026-09-10",
    "daysOverdue": 0,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000045-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-045",
    "sopTitle": "Advance Tax Estimation & Filing",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-Q3",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Tushar Seth",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Tushar Seth",
    "actualChecker": null,
    "dueDate": "2026-09-08",
    "daysOverdue": 0,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000046-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-046",
    "sopTitle": "UK Companies House Statutory Filing",
    "processCategory": "Financial Reporting",
    "periodKey": "2026-M08",
    "entityCode": "CK_UK",
    "entityName": "CK UK",
    "makerName": "Vivek Raj",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": "Manoj Agarwal",
    "dueDate": "2026-09-06",
    "daysOverdue": 0,
    "status": "APPROVED"
  },
  {
    "taskId": "b0000047-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-047",
    "sopTitle": "US Treasury Wire Reconciliation",
    "processCategory": "Treasury & Cash Management",
    "periodKey": "2026-M07",
    "entityCode": "CK_US",
    "entityName": "CK US",
    "makerName": "Tushar Seth",
    "checkerName": "Vivek Raj",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Vivek Raj",
      "Mainak Gupta"
    ],
    "actualMaker": "Tushar Seth",
    "actualChecker": null,
    "dueDate": "2026-08-28",
    "daysOverdue": 0,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000048-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-048",
    "sopTitle": "US Employee W2 & State Tax Deposit",
    "processCategory": "Payroll & Statutory",
    "periodKey": "2026-M07",
    "entityCode": "CK_US",
    "entityName": "CK US",
    "makerName": "Prayasa Sharma",
    "checkerName": "Vivek Raj",
    "assignedMakers": [
      "Prayasa Sharma",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Vivek Raj",
      "Mainak Gupta"
    ],
    "actualMaker": null,
    "actualChecker": null,
    "dueDate": "2026-09-03",
    "daysOverdue": 0,
    "status": "OPEN"
  },
  {
    "taskId": "b0000049-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-049",
    "sopTitle": "Monthly Payroll & Statutory PF Deposit",
    "processCategory": "Payroll & Statutory",
    "periodKey": "2026-Y2026",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Vivek Raj",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": "Manoj Agarwal",
    "dueDate": "2026-09-04",
    "daysOverdue": 0,
    "status": "APPROVED"
  },
  {
    "taskId": "b0000050-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-050",
    "sopTitle": "UK Companies House Statutory Filing",
    "processCategory": "Financial Reporting",
    "periodKey": "2026-M07",
    "entityCode": "CK_UK",
    "entityName": "CK UK",
    "makerName": "Vivek Raj",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": "Manoj Agarwal",
    "dueDate": "2026-09-02",
    "daysOverdue": 0,
    "status": "REJECTED"
  },
  {
    "taskId": "b0000051-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-051",
    "sopTitle": "UK Companies House Statutory Filing",
    "processCategory": "Financial Reporting",
    "periodKey": "2026-D240",
    "entityCode": "CK_UK",
    "entityName": "CK UK",
    "makerName": "Tushar Seth",
    "checkerName": "Mainak Gupta",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Mainak Gupta",
      "Manoj Agarwal"
    ],
    "actualMaker": "Tushar Seth",
    "actualChecker": null,
    "dueDate": "2026-07-03",
    "daysOverdue": 55,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000052-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-052",
    "sopTitle": "UK Companies House Statutory Filing",
    "processCategory": "Financial Reporting",
    "periodKey": "2026-Q2",
    "entityCode": "CK_UK",
    "entityName": "CK UK",
    "makerName": "Vivek Raj",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": null,
    "dueDate": "2026-07-02",
    "daysOverdue": 56,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000053-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-053",
    "sopTitle": "Quarterly TDS Return Filing Form 26Q",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-Q3",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Tushar Seth",
    "checkerName": "Mainak Gupta",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Mainak Gupta",
      "Manoj Agarwal"
    ],
    "actualMaker": "Tushar Seth",
    "actualChecker": "Mainak Gupta",
    "dueDate": "2026-07-04",
    "daysOverdue": 0,
    "status": "REJECTED"
  },
  {
    "taskId": "b0000054-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-054",
    "sopTitle": "Fixed Assets & Depreciation Schedule",
    "processCategory": "Fixed Assets",
    "periodKey": "2026-M07",
    "entityCode": "CK_AUSTRALIA",
    "entityName": "CK Australia",
    "makerName": "Vivek Raj",
    "checkerName": "Mainak Gupta",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Mainak Gupta",
      "Manoj Agarwal"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": "Mainak Gupta",
    "dueDate": "2026-07-08",
    "daysOverdue": 0,
    "status": "REJECTED"
  },
  {
    "taskId": "b0000055-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-055",
    "sopTitle": "Quarterly TDS Return Filing Form 26Q",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-D240",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Vivek Raj",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Vivek Raj",
    "actualChecker": "Manoj Agarwal",
    "dueDate": "2026-07-05",
    "daysOverdue": 0,
    "status": "APPROVED"
  },
  {
    "taskId": "b0000056-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-056",
    "sopTitle": "Monthly Payroll & Statutory PF Deposit",
    "processCategory": "Payroll & Statutory",
    "periodKey": "2026-D240",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Vivek Raj",
    "checkerName": "Mainak Gupta",
    "assignedMakers": [
      "Vivek Raj",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Mainak Gupta",
      "Manoj Agarwal"
    ],
    "actualMaker": null,
    "actualChecker": null,
    "dueDate": "2026-06-30",
    "daysOverdue": 58,
    "status": "OPEN"
  },
  {
    "taskId": "b0000057-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-057",
    "sopTitle": "GSTR-3B & GSTR-1 Monthly Return Filing",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-M07",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Prayasa Sharma",
    "checkerName": "Vivek Raj",
    "assignedMakers": [
      "Prayasa Sharma",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Vivek Raj",
      "Mainak Gupta"
    ],
    "actualMaker": "Prayasa Sharma",
    "actualChecker": null,
    "dueDate": "2026-07-22",
    "daysOverdue": 36,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000058-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-058",
    "sopTitle": "Advance Tax Estimation & Filing",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-D240",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Tushar Seth",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": "Tushar Seth",
    "actualChecker": null,
    "dueDate": "2026-07-04",
    "daysOverdue": 54,
    "status": "PENDING_REVIEW"
  },
  {
    "taskId": "b0000059-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-059",
    "sopTitle": "GSTR-3B & GSTR-1 Monthly Return Filing",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-D240",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Prayasa Sharma",
    "checkerName": "Mainak Gupta",
    "assignedMakers": [
      "Prayasa Sharma",
      "Tushar Seth"
    ],
    "assignedCheckers": [
      "Mainak Gupta",
      "Manoj Agarwal"
    ],
    "actualMaker": "Prayasa Sharma",
    "actualChecker": "Mainak Gupta",
    "dueDate": "2026-07-10",
    "daysOverdue": 0,
    "status": "APPROVED"
  },
  {
    "taskId": "b0000060-0000-0000-0000-000000000000",
    "recordNo": "TSK-202608-060",
    "sopTitle": "Quarterly TDS Return Filing Form 26Q",
    "processCategory": "Tax Compliance",
    "periodKey": "2026-D240",
    "entityCode": "CK_INDIA",
    "entityName": "CK India",
    "makerName": "Tushar Seth",
    "checkerName": "Manoj Agarwal",
    "assignedMakers": [
      "Tushar Seth",
      "Vivek Raj"
    ],
    "assignedCheckers": [
      "Manoj Agarwal",
      "Mainak Gupta"
    ],
    "actualMaker": null,
    "actualChecker": null,
    "dueDate": "2026-07-07",
    "daysOverdue": 51,
    "status": "OPEN"
  }
];

export const MOCK_ORGANIZATION_USERS = [
  {
    id: 'usr-manoj-042',
    name: 'Manoj Agarwal',
    email: 'manoj.agarwal@cloudkaptan.com',
    groups: ['fin_sop_admin'],
  },
  {
    id: 'usr-vivek-108',
    name: 'Vivek Raj',
    email: 'vivek.raj@cloudkaptan.com',
    groups: [
      'fin_sop_ck_india_maker',
      'fin_sop_ck_india_checker',
      'fin_sop_ck_us_maker',
      'fin_sop_ck_us_checker',
      'fin_sop_ck_uk_maker',
      'fin_sop_ck_uk_checker',
      'fin_sop_ck_australia_maker',
      'fin_sop_ck_australia_checker',
    ],
  },
  {
    id: 'usr-mainak-215',
    name: 'Mainak Gupta',
    email: 'mainak.gupta@cloudkaptan.com',
    groups: [
      'fin_sop_ck_india_checker',
      'fin_sop_ck_us_checker',
      'fin_sop_ck_uk_checker',
      'fin_sop_ck_australia_checker',
    ],
  },
  {
    id: 'usr-tushar-304',
    name: 'Tushar Seth',
    email: 'tushar.seth@cloudkaptan.com',
    groups: [
      'fin_sop_ck_india_maker',
      'fin_sop_ck_us_maker',
      'fin_sop_ck_uk_maker',
      'fin_sop_ck_australia_maker',
    ],
  },
  {
    id: 'usr-prayasa-410',
    name: 'Prayasa Sharma',
    email: 'prayasa.sharma@cloudkaptan.com',
    groups: [
      'fin_sop_ck_india_maker',
      'fin_sop_ck_us_maker',
    ],
  },
  {
    id: 'usr-avisek-499',
    name: 'Avisek Shaw',
    email: 'avisek.shaw@cloudkaptan.com',
    groups: ['fin_sop_viewer'],
  },
];

export const MOCK_AUDIT_LOGS = [
  {
    "auditId": 201,
    "timestamp": "2026-08-28T11:12:00.000Z",
    "correlationId": "corr-7718-77",
    "actorId": "usr-manoj",
    "actorName": "Manoj Agarwal",
    "actorEmail": "manoj.agarwal@cloudkaptan.com",
    "action": "APPROVE_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-001"
  },
  {
    "auditId": 202,
    "timestamp": "2026-08-28T09:41:00.000Z",
    "correlationId": "corr-9912-68",
    "actorId": "usr-tushar",
    "actorName": "Tushar Seth",
    "actorEmail": "tushar.seth@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-002"
  },
  {
    "auditId": 203,
    "timestamp": "2026-08-28T11:14:00.000Z",
    "correlationId": "corr-3470-75",
    "actorId": "usr-vivek",
    "actorName": "Vivek Raj",
    "actorEmail": "vivek.raj@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-003"
  },
  {
    "auditId": 204,
    "timestamp": "2026-08-28T07:42:00.000Z",
    "correlationId": "corr-8140-52",
    "actorId": "usr-tushar",
    "actorName": "Tushar Seth",
    "actorEmail": "tushar.seth@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-004"
  },
  {
    "auditId": 205,
    "timestamp": "2026-08-28T11:03:00.000Z",
    "correlationId": "corr-1777-59",
    "actorId": "usr-vivek",
    "actorName": "Vivek Raj",
    "actorEmail": "vivek.raj@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-005"
  },
  {
    "auditId": 206,
    "timestamp": "2026-08-24T12:24:00.000Z",
    "correlationId": "corr-7462-48",
    "actorId": "usr-manoj",
    "actorName": "Manoj Agarwal",
    "actorEmail": "manoj.agarwal@cloudkaptan.com",
    "action": "REJECT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-006"
  },
  {
    "auditId": 207,
    "timestamp": "2026-08-23T07:19:00.000Z",
    "correlationId": "corr-4075-10",
    "actorId": "usr-tushar",
    "actorName": "Tushar Seth",
    "actorEmail": "tushar.seth@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-007"
  },
  {
    "auditId": 208,
    "timestamp": "2026-08-22T11:06:00.000Z",
    "correlationId": "corr-4050-25",
    "actorId": "usr-mainak",
    "actorName": "Mainak Gupta",
    "actorEmail": "mainak.gupta@cloudkaptan.com",
    "action": "REJECT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-008"
  },
  {
    "auditId": 209,
    "timestamp": "2026-08-27T03:50:00.000Z",
    "correlationId": "corr-6096-62",
    "actorId": "usr-prayasa",
    "actorName": "Prayasa Sharma",
    "actorEmail": "prayasa.sharma@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-009"
  },
  {
    "auditId": 210,
    "timestamp": "2026-08-24T07:53:00.000Z",
    "correlationId": "corr-7742-62",
    "actorId": "usr-vivek",
    "actorName": "Vivek Raj",
    "actorEmail": "vivek.raj@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-010"
  },
  {
    "auditId": 211,
    "timestamp": "2026-08-24T07:18:00.000Z",
    "correlationId": "corr-6288-97",
    "actorId": "usr-prayasa",
    "actorName": "Prayasa Sharma",
    "actorEmail": "prayasa.sharma@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-011"
  },
  {
    "auditId": 212,
    "timestamp": "2026-08-25T05:10:00.000Z",
    "correlationId": "corr-5109-58",
    "actorId": "usr-mainak",
    "actorName": "Mainak Gupta",
    "actorEmail": "mainak.gupta@cloudkaptan.com",
    "action": "REJECT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-012"
  },
  {
    "auditId": 213,
    "timestamp": "2026-08-24T09:22:00.000Z",
    "correlationId": "corr-2489-67",
    "actorId": "usr-manoj",
    "actorName": "Manoj Agarwal",
    "actorEmail": "manoj.agarwal@cloudkaptan.com",
    "action": "APPROVE_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-013"
  },
  {
    "auditId": 214,
    "timestamp": "2026-08-26T05:00:00.000Z",
    "correlationId": "corr-9145-72",
    "actorId": "usr-vivek",
    "actorName": "Vivek Raj",
    "actorEmail": "vivek.raj@cloudkaptan.com",
    "action": "APPROVE_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-014"
  },
  {
    "auditId": 215,
    "timestamp": "2026-08-22T05:23:00.000Z",
    "correlationId": "corr-3365-25",
    "actorId": "usr-manoj",
    "actorName": "Manoj Agarwal",
    "actorEmail": "manoj.agarwal@cloudkaptan.com",
    "action": "APPROVE_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-015"
  },
  {
    "auditId": 216,
    "timestamp": "2026-08-26T12:24:00.000Z",
    "correlationId": "corr-8632-76",
    "actorId": "usr-manoj",
    "actorName": "Manoj Agarwal",
    "actorEmail": "manoj.agarwal@cloudkaptan.com",
    "action": "APPROVE_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-016"
  },
  {
    "auditId": 217,
    "timestamp": "2026-08-25T08:27:00.000Z",
    "correlationId": "corr-7998-13",
    "actorId": "usr-vivek",
    "actorName": "Vivek Raj",
    "actorEmail": "vivek.raj@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-017"
  },
  {
    "auditId": 218,
    "timestamp": "2026-08-30T03:55:00.000Z",
    "correlationId": "corr-9923-30",
    "actorId": "usr-vivek",
    "actorName": "Vivek Raj",
    "actorEmail": "vivek.raj@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-018"
  },
  {
    "auditId": 219,
    "timestamp": "2026-08-30T10:51:00.000Z",
    "correlationId": "corr-6264-96",
    "actorId": "usr-mainak",
    "actorName": "Mainak Gupta",
    "actorEmail": "mainak.gupta@cloudkaptan.com",
    "action": "APPROVE_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-019"
  },
  {
    "auditId": 220,
    "timestamp": "2026-08-27T11:04:00.000Z",
    "correlationId": "corr-6016-43",
    "actorId": "usr-tushar",
    "actorName": "Tushar Seth",
    "actorEmail": "tushar.seth@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-020"
  },
  {
    "auditId": 221,
    "timestamp": "2026-08-27T06:19:00.000Z",
    "correlationId": "corr-5472-57",
    "actorId": "usr-manoj",
    "actorName": "Manoj Agarwal",
    "actorEmail": "manoj.agarwal@cloudkaptan.com",
    "action": "APPROVE_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-021"
  },
  {
    "auditId": 222,
    "timestamp": "2026-08-26T04:16:00.000Z",
    "correlationId": "corr-4021-17",
    "actorId": "usr-vivek",
    "actorName": "Vivek Raj",
    "actorEmail": "vivek.raj@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-022"
  },
  {
    "auditId": 223,
    "timestamp": "2026-08-28T12:03:00.000Z",
    "correlationId": "corr-1974-57",
    "actorId": "usr-vivek",
    "actorName": "Vivek Raj",
    "actorEmail": "vivek.raj@cloudkaptan.com",
    "action": "REJECT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-023"
  },
  {
    "auditId": 224,
    "timestamp": "2026-08-28T11:40:00.000Z",
    "correlationId": "corr-3531-95",
    "actorId": "usr-mainak",
    "actorName": "Mainak Gupta",
    "actorEmail": "mainak.gupta@cloudkaptan.com",
    "action": "APPROVE_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-024"
  },
  {
    "auditId": 225,
    "timestamp": "2026-08-24T12:11:00.000Z",
    "correlationId": "corr-9174-68",
    "actorId": "usr-tushar",
    "actorName": "Tushar Seth",
    "actorEmail": "tushar.seth@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-025"
  },
  {
    "auditId": 226,
    "timestamp": "2026-08-11T11:25:00.000Z",
    "correlationId": "corr-4301-64",
    "actorId": "usr-manoj",
    "actorName": "Manoj Agarwal",
    "actorEmail": "manoj.agarwal@cloudkaptan.com",
    "action": "REJECT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-026"
  },
  {
    "auditId": 227,
    "timestamp": "2026-08-05T09:11:00.000Z",
    "correlationId": "corr-6693-28",
    "actorId": "usr-vivek",
    "actorName": "Vivek Raj",
    "actorEmail": "vivek.raj@cloudkaptan.com",
    "action": "REJECT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-027"
  },
  {
    "auditId": 228,
    "timestamp": "2026-08-02T04:00:00.000Z",
    "correlationId": "corr-2697-41",
    "actorId": "usr-manoj",
    "actorName": "Manoj Agarwal",
    "actorEmail": "manoj.agarwal@cloudkaptan.com",
    "action": "APPROVE_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-028"
  },
  {
    "auditId": 229,
    "timestamp": "2026-08-07T07:05:00.000Z",
    "correlationId": "corr-4692-66",
    "actorId": "usr-vivek",
    "actorName": "Vivek Raj",
    "actorEmail": "vivek.raj@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-029"
  },
  {
    "auditId": 230,
    "timestamp": "2026-08-06T07:18:00.000Z",
    "correlationId": "corr-3938-53",
    "actorId": "usr-vivek",
    "actorName": "Vivek Raj",
    "actorEmail": "vivek.raj@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-030"
  },
  {
    "auditId": 231,
    "timestamp": "2026-08-10T05:07:00.000Z",
    "correlationId": "corr-2967-72",
    "actorId": "usr-manoj",
    "actorName": "Manoj Agarwal",
    "actorEmail": "manoj.agarwal@cloudkaptan.com",
    "action": "APPROVE_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-031"
  },
  {
    "auditId": 232,
    "timestamp": "2026-08-07T11:51:00.000Z",
    "correlationId": "corr-9382-67",
    "actorId": "usr-mainak",
    "actorName": "Mainak Gupta",
    "actorEmail": "mainak.gupta@cloudkaptan.com",
    "action": "APPROVE_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-032"
  },
  {
    "auditId": 233,
    "timestamp": "2026-08-07T06:59:00.000Z",
    "correlationId": "corr-7749-36",
    "actorId": "usr-vivek",
    "actorName": "Vivek Raj",
    "actorEmail": "vivek.raj@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-033"
  },
  {
    "auditId": 234,
    "timestamp": "2026-08-12T08:50:00.000Z",
    "correlationId": "corr-9506-99",
    "actorId": "usr-tushar",
    "actorName": "Tushar Seth",
    "actorEmail": "tushar.seth@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-034"
  },
  {
    "auditId": 235,
    "timestamp": "2026-08-19T04:58:00.000Z",
    "correlationId": "corr-9630-83",
    "actorId": "usr-manoj",
    "actorName": "Manoj Agarwal",
    "actorEmail": "manoj.agarwal@cloudkaptan.com",
    "action": "REJECT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-035"
  },
  {
    "auditId": 236,
    "timestamp": "2026-08-19T10:12:00.000Z",
    "correlationId": "corr-2773-18",
    "actorId": "usr-prayasa",
    "actorName": "Prayasa Sharma",
    "actorEmail": "prayasa.sharma@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-036"
  },
  {
    "auditId": 237,
    "timestamp": "2026-08-18T04:24:00.000Z",
    "correlationId": "corr-4862-68",
    "actorId": "usr-tushar",
    "actorName": "Tushar Seth",
    "actorEmail": "tushar.seth@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-037"
  },
  {
    "auditId": 238,
    "timestamp": "2026-08-15T04:16:00.000Z",
    "correlationId": "corr-9838-10",
    "actorId": "usr-mainak",
    "actorName": "Mainak Gupta",
    "actorEmail": "mainak.gupta@cloudkaptan.com",
    "action": "APPROVE_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-038"
  },
  {
    "auditId": 239,
    "timestamp": "2026-08-21T09:24:00.000Z",
    "correlationId": "corr-7493-63",
    "actorId": "usr-mainak",
    "actorName": "Mainak Gupta",
    "actorEmail": "mainak.gupta@cloudkaptan.com",
    "action": "APPROVE_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-039"
  },
  {
    "auditId": 240,
    "timestamp": "2026-08-17T06:40:00.000Z",
    "correlationId": "corr-2091-14",
    "actorId": "usr-prayasa",
    "actorName": "Prayasa Sharma",
    "actorEmail": "prayasa.sharma@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-040"
  },
  {
    "auditId": 241,
    "timestamp": "2026-08-29T11:04:00.000Z",
    "correlationId": "corr-2721-44",
    "actorId": "usr-prayasa",
    "actorName": "Prayasa Sharma",
    "actorEmail": "prayasa.sharma@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-041"
  },
  {
    "auditId": 242,
    "timestamp": "2026-08-29T08:14:00.000Z",
    "correlationId": "corr-5418-69",
    "actorId": "usr-tushar",
    "actorName": "Tushar Seth",
    "actorEmail": "tushar.seth@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-042"
  },
  {
    "auditId": 243,
    "timestamp": "2026-09-12T04:16:00.000Z",
    "correlationId": "corr-1278-99",
    "actorId": "usr-tushar",
    "actorName": "Tushar Seth",
    "actorEmail": "tushar.seth@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-043"
  },
  {
    "auditId": 244,
    "timestamp": "2026-09-11T08:10:00.000Z",
    "correlationId": "corr-3743-53",
    "actorId": "usr-vivek",
    "actorName": "Vivek Raj",
    "actorEmail": "vivek.raj@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-044"
  },
  {
    "auditId": 245,
    "timestamp": "2026-09-09T06:42:00.000Z",
    "correlationId": "corr-9240-70",
    "actorId": "usr-tushar",
    "actorName": "Tushar Seth",
    "actorEmail": "tushar.seth@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-045"
  },
  {
    "auditId": 246,
    "timestamp": "2026-09-07T03:53:00.000Z",
    "correlationId": "corr-3640-28",
    "actorId": "usr-manoj",
    "actorName": "Manoj Agarwal",
    "actorEmail": "manoj.agarwal@cloudkaptan.com",
    "action": "APPROVE_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-046"
  },
  {
    "auditId": 247,
    "timestamp": "2026-08-29T03:58:00.000Z",
    "correlationId": "corr-7141-36",
    "actorId": "usr-tushar",
    "actorName": "Tushar Seth",
    "actorEmail": "tushar.seth@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-047"
  },
  {
    "auditId": 248,
    "timestamp": "2026-09-04T11:15:00.000Z",
    "correlationId": "corr-7628-91",
    "actorId": "usr-prayasa",
    "actorName": "Prayasa Sharma",
    "actorEmail": "prayasa.sharma@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-048"
  },
  {
    "auditId": 249,
    "timestamp": "2026-09-05T08:22:00.000Z",
    "correlationId": "corr-1573-77",
    "actorId": "usr-manoj",
    "actorName": "Manoj Agarwal",
    "actorEmail": "manoj.agarwal@cloudkaptan.com",
    "action": "APPROVE_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-049"
  },
  {
    "auditId": 250,
    "timestamp": "2026-09-03T11:40:00.000Z",
    "correlationId": "corr-3122-65",
    "actorId": "usr-manoj",
    "actorName": "Manoj Agarwal",
    "actorEmail": "manoj.agarwal@cloudkaptan.com",
    "action": "REJECT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-050"
  },
  {
    "auditId": 251,
    "timestamp": "2026-07-04T06:21:00.000Z",
    "correlationId": "corr-5197-45",
    "actorId": "usr-tushar",
    "actorName": "Tushar Seth",
    "actorEmail": "tushar.seth@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-051"
  },
  {
    "auditId": 252,
    "timestamp": "2026-07-03T04:04:00.000Z",
    "correlationId": "corr-7849-83",
    "actorId": "usr-vivek",
    "actorName": "Vivek Raj",
    "actorEmail": "vivek.raj@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-052"
  },
  {
    "auditId": 253,
    "timestamp": "2026-07-05T08:28:00.000Z",
    "correlationId": "corr-1812-48",
    "actorId": "usr-mainak",
    "actorName": "Mainak Gupta",
    "actorEmail": "mainak.gupta@cloudkaptan.com",
    "action": "REJECT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-053"
  },
  {
    "auditId": 254,
    "timestamp": "2026-07-09T06:25:00.000Z",
    "correlationId": "corr-3565-70",
    "actorId": "usr-mainak",
    "actorName": "Mainak Gupta",
    "actorEmail": "mainak.gupta@cloudkaptan.com",
    "action": "REJECT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-054"
  },
  {
    "auditId": 255,
    "timestamp": "2026-07-06T08:23:00.000Z",
    "correlationId": "corr-2546-17",
    "actorId": "usr-manoj",
    "actorName": "Manoj Agarwal",
    "actorEmail": "manoj.agarwal@cloudkaptan.com",
    "action": "APPROVE_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-055"
  },
  {
    "auditId": 256,
    "timestamp": "2026-07-01T10:08:00.000Z",
    "correlationId": "corr-6394-14",
    "actorId": "usr-vivek",
    "actorName": "Vivek Raj",
    "actorEmail": "vivek.raj@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-056"
  },
  {
    "auditId": 257,
    "timestamp": "2026-07-23T04:12:00.000Z",
    "correlationId": "corr-7577-89",
    "actorId": "usr-prayasa",
    "actorName": "Prayasa Sharma",
    "actorEmail": "prayasa.sharma@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-057"
  },
  {
    "auditId": 258,
    "timestamp": "2026-07-05T05:51:00.000Z",
    "correlationId": "corr-8156-80",
    "actorId": "usr-tushar",
    "actorName": "Tushar Seth",
    "actorEmail": "tushar.seth@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-058"
  },
  {
    "auditId": 259,
    "timestamp": "2026-07-11T04:41:00.000Z",
    "correlationId": "corr-4521-93",
    "actorId": "usr-mainak",
    "actorName": "Mainak Gupta",
    "actorEmail": "mainak.gupta@cloudkaptan.com",
    "action": "APPROVE_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-059"
  },
  {
    "auditId": 260,
    "timestamp": "2026-07-08T10:57:00.000Z",
    "correlationId": "corr-9561-10",
    "actorId": "usr-tushar",
    "actorName": "Tushar Seth",
    "actorEmail": "tushar.seth@cloudkaptan.com",
    "action": "SUBMIT_TASK",
    "entityType": "TASK",
    "entityId": "TSK-202608-060"
  }
];

export async function fetchJson(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      const message = errorJson?.message || errorJson?.error?.detail || `API error: ${res.status} ${res.statusText}`;
      throw new Error(message);
    }
    const json = await res.json();
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.success ? json.data : null;
    }
    return json;
  } catch (err) {
    console.warn(`[API Call Failed: ${endpoint}]`, err.message);
    throw err;
  }
}

export function mapTask(dto) {
  if (!dto) return null;

  const defaultMakers = ['Tushar Seth', 'Vivek Raj'];
  const defaultCheckers = ['Mainak Gupta', 'Vivek Raj'];

  const makerList = dto.assignedMakers || (dto.makerName ? [dto.makerName] : defaultMakers);
  const checkerList = dto.assignedCheckers || (dto.checkerName ? [dto.checkerName] : defaultCheckers);

  // First-come first-served locking logic
  const isSubmittedOrDone = dto.status === 'PENDING_REVIEW' || dto.status === 'APPROVED' || dto.status === 'REJECTED';
  const lockedMaker = dto.actualMaker || (isSubmittedOrDone ? (dto.makerName || dto.maker || 'Tushar Seth') : null);

  const isCompleted = dto.status === 'APPROVED' || dto.status === 'REJECTED';
  const lockedChecker = dto.actualChecker || (isCompleted ? (dto.checkerName || dto.checker || 'Mainak Gupta') : null);

  return {
    id: dto.taskId || dto.id,
    record: dto.recordNo || dto.record || 'N/A',
    sop: dto.sopTitle || dto.sop || 'N/A',
    entity: dto.entityName || dto.entity || dto.entityCode || 'N/A',
    entityCode: dto.entityCode || dto.entityId,
    period: dto.periodKey || dto.period || 'N/A',
    maker: lockedMaker || makerList.join(', '),
    makerId: dto.makerId,
    assignedMakers: makerList,
    lockedMaker: lockedMaker,
    checker: lockedChecker || checkerList.join(', '),
    checkerId: dto.checkerId,
    assignedCheckers: checkerList,
    lockedChecker: lockedChecker,
    dueDate: dto.dueDate || 'N/A',
    daysOverdue: dto.daysOverdue || 0,
    status: dto.status || 'OPEN',
  };
}

export function mapSop(dto) {
  if (!dto) return null;
  const defaultMakers = ['Tushar Seth', 'Vivek Raj'];
  const defaultCheckers = ['Mainak Gupta', 'Vivek Raj'];

  const makers = dto.defaultMakerNames || (dto.defaultMakerName ? [dto.defaultMakerName] : defaultMakers);
  const checkers = dto.defaultCheckerNames || (dto.defaultCheckerName ? [dto.defaultCheckerName] : defaultCheckers);

  return {
    id: dto.sopId || dto.id,
    code: dto.sopCode || dto.code || 'N/A',
    name: dto.title || dto.name || 'N/A',
    process: dto.processCategory || dto.process || 'N/A',
    entity: dto.entityName || dto.entity || dto.entityCode || 'N/A',
    entityCode: dto.entityCode || dto.entityId,
    frequency: dto.frequency || 'MONTHLY',
    dueDay: dto.dueDayOffset ?? dto.dueDay ?? 1,
    maker: makers.join(', '),
    checker: checkers.join(', '),
    makers: makers,
    checkers: checkers,
    version: 1,
  };
}

export async function getDashboardSummary(selectedEntities = [], currentUser = null) {
  const params = new URLSearchParams();
  if (selectedEntities.length > 0) params.append('entities', selectedEntities.join(','));
  if (currentUser?.id) params.append('userId', currentUser.id);

  const query = params.toString() ? `?${params.toString()}` : '';
  const data = await fetchJson(`/dashboard/summary${query}`).catch(() => null);

  const rawName = currentUser?.name || '';
  const cleanName = rawName.split(' (')[0].trim().toLowerCase();
  const userRole = currentUser?.role || 'VIEWER';
  const isAdmin = userRole === 'ADMIN';
  const isViewer = userRole === 'VIEWER';

  function isUserMatch(personName) {
    if (!personName) return false;
    const cleanPerson = personName.toLowerCase().trim();
    return cleanPerson.includes(cleanName) || cleanName.includes(cleanPerson);
  }

  if (data && data.metrics) {
    return {
      metrics: {
        trackedTasks: Number(data.metrics.trackedTasks || 0),
        approvedThisCycle: Number(data.metrics.approvedThisCycle || 0),
        pendingReview: Number(data.metrics.pendingReview || 0),
        overdue: Number(data.metrics.overdue || 0),
      },
      scorecard: data.scorecard || [],
      overdueList: (data.overdueList || []).map(mapTask),
    };
  }

  // Initial fallback dashboard summary from demo tasks
  const allTasks = MOCK_TASKS.filter(t => selectedEntities.length === 0 || selectedEntities.includes(t.entityCode));
  
  const userTasks = allTasks.filter(t => {
    if (isAdmin || isViewer) return true;
    const isMakerMatch = isUserMatch(t.makerName) || isUserMatch(t.assignedMakers?.join(', ')) || isUserMatch(t.actualMaker);
    const isCheckerMatch = isUserMatch(t.checkerName) || isUserMatch(t.assignedCheckers?.join(', ')) || isUserMatch(t.actualChecker);
    return isMakerMatch || isCheckerMatch;
  });

  const totalTasks = userTasks.length;
  const approvedTasks = userTasks.filter(t => t.status === 'APPROVED').length;
  const pendingReviewTasks = userTasks.filter(t => t.status === 'PENDING_REVIEW').length;
  const overdueTasks = userTasks.filter(t => t.daysOverdue > 0).length;

  const scorecard = ENTITIES.filter(e => selectedEntities.length === 0 || selectedEntities.includes(e.id)).map(e => {
    const entityTasks = userTasks.filter(t => t.entityCode === e.id);
    const total = entityTasks.length;
    const overdueCount = entityTasks.filter(t => t.daysOverdue > 0 || t.status === 'REJECTED').length;
    const approved = entityTasks.filter(t => t.status === 'APPROVED').length;
    const rate = total > 0 ? `${Math.round((approved / total) * 100)}%` : '100%';
    return {
      entityId: e.id,
      entity: e.label,
      totalTasks: total,
      overdue: overdueCount,
      onTimeRate: rate,
    };
  });

  return {
    metrics: {
      trackedTasks: totalTasks,
      approvedThisCycle: approvedTasks,
      pendingReview: pendingReviewTasks,
      overdue: overdueTasks,
    },
    scorecard: scorecard,
    overdueList: userTasks.filter(t => t.daysOverdue > 0).map(mapTask),
  };
}

export async function getTasks(selectedEntities = []) {
  const query = selectedEntities.length > 0 ? `?entities=${selectedEntities.join(',')}` : '';
  const list = await fetchJson(`/tasks${query}`).catch(() => []);
  if (Array.isArray(list) && list.length > 0) {
    return list.map(mapTask);
  }
  const filtered = MOCK_TASKS.filter(t => selectedEntities.length === 0 || selectedEntities.includes(t.entityCode));
  return filtered.map(mapTask);
}

export async function getInboxTasks(selectedEntities = [], status = null, userId = null) {
  const params = new URLSearchParams();
  if (selectedEntities.length > 0) params.append('entities', selectedEntities.join(','));
  if (status) params.append('status', status);
  if (userId) params.append('userId', userId);
  const query = params.toString() ? `?${params.toString()}` : '';
  const result = await fetchJson(`/tasks/inbox${query}`).catch(() => []);
  if (result && Array.isArray(result.content) && result.content.length > 0) {
    return result.content.map(mapTask);
  }
  if (Array.isArray(result) && result.length > 0) {
    return result.map(mapTask);
  }
  const filtered = MOCK_TASKS.filter(t => selectedEntities.length === 0 || selectedEntities.includes(t.entityCode));
  return filtered.map(mapTask);
}

export async function getSops(selectedEntities = []) {
  const query = selectedEntities.length > 0 ? `?entities=${selectedEntities.join(',')}` : '';
  const list = await fetchJson(`/sops${query}`).catch(() => []);
  if (Array.isArray(list) && list.length > 0) {
    return list.map(mapSop);
  }
  const filtered = MOCK_SOPS.filter(s => selectedEntities.length === 0 || selectedEntities.includes(s.entityCode));
  return filtered.map(mapSop);
}

export async function getAuditLogs() {
  const list = await fetchJson('/audit-logs').catch(() => null);
  if (Array.isArray(list) && list.length > 0) {
    return list;
  }
  return MOCK_AUDIT_LOGS;
}

export async function createSop(sopData) {
  const res = await fetchJson('/sops', {
    method: 'POST',
    body: JSON.stringify(sopData),
  }).catch(() => null);

  const newSop = res ? mapSop(res) : {
    id: `sop-${Date.now()}`,
    code: sopData.sopCode,
    name: sopData.title,
    process: sopData.processCategory,
    entity: sopData.entityCode === 'CK_INDIA' ? 'CK India' : sopData.entityCode === 'CK_US' ? 'CK US' : 'CK UK',
    entityCode: sopData.entityCode,
    frequency: sopData.frequency,
    dueDay: sopData.dueDayOffset,
    maker: 'Tushar Seth',
    checker: 'Mainak Gupta',
    makers: ['Tushar Seth'],
    checkers: ['Mainak Gupta'],
    version: 1,
  };

  MOCK_SOPS.unshift(newSop);
  return newSop;
}

export async function getUsers(entityCode = null, targetRole = null) {
  const params = new URLSearchParams();
  if (entityCode) params.append('entity', entityCode);
  if (targetRole) params.append('role', targetRole);
  const query = params.toString() ? `?${params.toString()}` : '';

  const res = await fetchJson(`/access/users${query}`).catch(() => null);
  
  const allUsers = (Array.isArray(res) && res.length > 0) ? res.map(u => ({
    id: u.userId || u.id,
    name: u.fullName || u.name,
    email: u.email,
    groups: u.groups || u.oidcGroups || [
      `fin_sop_${(entityCode || 'ck_india').toLowerCase()}_${(targetRole || 'maker').toLowerCase()}`
    ],
  })) : MOCK_ORGANIZATION_USERS;

  return allUsers;
}

export async function getCurrentUser(email) {
  const query = email ? `?email=${encodeURIComponent(email)}` : '';
  return await fetchJson(`/access/me${query}`).catch(() => null);
}

export async function submitTask(taskId, actorId = 'usr-tushar-304', comment = '') {
  let id = taskId;
  let actor = actorId;
  let comm = comment;

  if (typeof taskId === 'object' && taskId !== null) {
    id = taskId.taskId || taskId.id || taskId.recordNo;
    if (typeof actorId === 'string' && !comment) {
      comm = actorId;
      actor = 'usr-tushar-304';
    }
  }

  const res = await fetchJson(`/tasks/${id}/submit`, {
    method: 'PUT',
    body: JSON.stringify({ actorId: actor, comment: comm }),
  }).catch(() => null);

  const mock = MOCK_TASKS.find(t => t.taskId === id || t.id === id || t.recordNo === id);
  if (mock) {
    mock.status = 'PENDING_REVIEW';
    mock.actualMaker = actor === 'usr-prayasa-410' ? 'Prayasa Sharma' : 'Tushar Seth';
  }
  return res;
}

export async function approveTask(taskId, actorId = 'usr-mainak-215', comment = '') {
  let id = taskId;
  let actor = actorId;
  let comm = comment;

  if (typeof taskId === 'object' && taskId !== null) {
    id = taskId.taskId || taskId.id || taskId.recordNo;
    if (typeof actorId === 'string' && !comment) {
      comm = actorId;
      actor = 'usr-mainak-215';
    }
  }

  const res = await fetchJson(`/tasks/${id}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ actorId: actor, comment: comm }),
  }).catch(() => null);

  const mock = MOCK_TASKS.find(t => t.taskId === id || t.id === id || t.recordNo === id);
  if (mock) {
    mock.status = 'APPROVED';
    mock.actualChecker = actor === 'usr-vivek-108' ? 'Vivek Raj' : 'Mainak Gupta';
  }
  return res;
}

export async function rejectTask(taskId, actorId = 'usr-mainak-215', comment = 'Requires correction') {
  let id = taskId;
  let actor = actorId;
  let comm = comment;

  if (typeof taskId === 'object' && taskId !== null) {
    id = taskId.taskId || taskId.id || taskId.recordNo;
    if (typeof actorId === 'string' && !comment) {
      comm = actorId;
      actor = 'usr-mainak-215';
    }
  }

  const res = await fetchJson(`/tasks/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ actorId: actor, comment: comm }),
  }).catch(() => null);

  const mock = MOCK_TASKS.find(t => t.taskId === id || t.id === id || t.recordNo === id);
  if (mock) {
    mock.status = 'REJECTED';
    mock.actualChecker = actor === 'usr-vivek-108' ? 'Vivek Raj' : 'Mainak Gupta';
  }
  return res;
}

export async function updateSop(sopId, sopData) {
  const res = await fetchJson(`/sops/${sopId}`, {
    method: 'PUT',
    body: JSON.stringify(sopData),
  }).catch(() => null);

  const targetIdx = MOCK_SOPS.findIndex(s => s.sopId === sopId || s.id === sopId || s.sopCode === sopData.sopCode || s.code === sopData.sopCode);
  if (targetIdx !== -1) {
    const existing = MOCK_SOPS[targetIdx];
    const updatedMakers = (sopData.defaultMakerNames || sopData.defaultMakerIds || []).map(m => m.replace('usr-', '').replace(/\b\w/g, l => l.toUpperCase()));
    const updatedCheckers = (sopData.defaultCheckerNames || sopData.defaultCheckerIds || []).map(c => c.replace('usr-', '').replace(/\b\w/g, l => l.toUpperCase()));

    MOCK_SOPS[targetIdx] = {
      ...existing,
      title: sopData.title || existing.title,
      name: sopData.title || existing.name || existing.title,
      description: sopData.description || existing.description,
      processCategory: sopData.processCategory || existing.processCategory,
      process: sopData.processCategory || existing.process,
      entityCode: sopData.entityCode || existing.entityCode,
      entityName: sopData.entityCode === 'CK_INDIA' ? 'CK India' : sopData.entityCode === 'CK_US' ? 'CK US' : sopData.entityCode === 'CK_UK' ? 'CK UK' : 'CK Australia',
      entity: sopData.entityCode === 'CK_INDIA' ? 'CK India' : sopData.entityCode === 'CK_US' ? 'CK US' : sopData.entityCode === 'CK_UK' ? 'CK UK' : 'CK Australia',
      frequency: sopData.frequency || existing.frequency,
      dueDayOffset: sopData.dueDayOffset || existing.dueDayOffset,
      dueDay: sopData.dueDayOffset || existing.dueDay,
      defaultMakerNames: updatedMakers.length ? updatedMakers : existing.defaultMakerNames,
      defaultCheckerNames: updatedCheckers.length ? updatedCheckers : existing.defaultCheckerNames,
      makers: updatedMakers.length ? updatedMakers : existing.makers,
      checkers: updatedCheckers.length ? updatedCheckers : existing.checkers,
      version: (existing.version || 1) + 1,
    };
    return mapSop(MOCK_SOPS[targetIdx]);
  }
  return res ? mapSop(res) : null;
}

export async function deleteSop(sopId) {
  await fetchJson(`/sops/${sopId}`, {
    method: 'DELETE',
  }).catch(() => null);

  const targetIdx = MOCK_SOPS.findIndex(s => s.sopId === sopId || s.id === sopId || s.sopCode === sopId || s.code === sopId);
  if (targetIdx !== -1) {
    MOCK_SOPS.splice(targetIdx, 1);
  }
  return true;
}

export async function deleteTask(taskId) {
  await fetchJson(`/tasks/${taskId}`, {
    method: 'DELETE',
  }).catch(() => null);

  const targetIdx = MOCK_TASKS.findIndex(t => t.taskId === taskId || t.id === taskId || t.recordNo === taskId || t.record === taskId);
  if (targetIdx !== -1) {
    MOCK_TASKS.splice(targetIdx, 1);
  }
  return true;
}

export async function verifyGoogleSsoToken(idToken) {
  return await fetchJson('/auth/google-sso', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

export async function generateScheduledTasks() {
  const res = await fetchJson('/tasks/generate-scheduled', {
    method: 'POST',
  }).catch(() => null);
  return res || { status: 'SUCCESS', message: 'Tasks generated successfully' };
}
