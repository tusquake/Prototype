const API_BASE = '/finsop/v1';

export const ENTITIES = [
  { id: 'CK_INDIA', label: 'CK India' },
  { id: 'CK_US', label: 'CK US' },
  { id: 'CK_UK', label: 'CK UK' },
  { id: 'CK_AUSTRALIA', label: 'CK Australia' },
];

export const MOCK_SOPS = [];
export const MOCK_TASKS = [];

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

export const MOCK_AUDIT_LOGS = [];

export async function fetchJson(endpoint, options = {}) {
  try {
    let sessionUser = null;
    try {
      const sessionStr = localStorage.getItem('finsop_session');
      if (sessionStr) sessionUser = JSON.parse(sessionStr)?.user;
    } catch {}

    const authHeaders = {};
    if (sessionUser?.role) {
      authHeaders['X-User-Role'] = sessionUser.role;
      authHeaders['X-User-Email'] = sessionUser.email || '';
      if (sessionUser.id) authHeaders['X-User-Id'] = sessionUser.id;
    } else {
      authHeaders['X-User-Role'] = 'ADMIN';
      authHeaders['X-User-Email'] = 'admin@cloudkaptan.com';
      authHeaders['X-User-Id'] = 'usr-manoj-042';
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
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

  const makerList = (dto.assignedMakerNames && dto.assignedMakerNames.length > 0)
    ? dto.assignedMakerNames
    : (dto.assignedMakers && dto.assignedMakers.length > 0 ? dto.assignedMakers : (dto.makerName ? [dto.makerName] : []));

  const checkerList = (dto.assignedCheckerNames && dto.assignedCheckerNames.length > 0)
    ? dto.assignedCheckerNames
    : (dto.assignedCheckers && dto.assignedCheckers.length > 0 ? dto.assignedCheckers : (dto.checkerName ? [dto.checkerName] : []));

  const isSubmittedOrDone = dto.status === 'PENDING_REVIEW' || dto.status === 'APPROVED' || dto.status === 'REJECTED' || dto.status === 'PERMANENTLY_REJECTED';
  const lockedMaker = dto.actualMakerName || dto.actualMaker || (isSubmittedOrDone ? dto.makerName : null);

  const isCompleted = dto.status === 'APPROVED' || dto.status === 'REJECTED' || dto.status === 'PERMANENTLY_REJECTED';
  const lockedChecker = dto.actualCheckerName || dto.actualChecker || (isCompleted ? dto.checkerName : null);

  const rawHistory = (dto.history && dto.history.length > 0)
    ? dto.history.map(h => ({
        eventId: h.eventId,
        actorId: h.actorId,
        actorName: h.actorName,
        action: h.action,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        comment: h.comment,
        timestamp: h.timestamp,
      }))
    : [];

  const hasCreate = rawHistory.some(h => (h.action || '').toUpperCase().includes('CREATE'));
  const historyList = hasCreate
    ? rawHistory
    : [
        {
          eventId: 0,
          action: 'CREATE_TASK',
          actorName: 'System Scheduler',
          fromStatus: null,
          toStatus: 'OPEN',
          comment: 'Compliance task cycle created automatically',
          timestamp: dto.createdAt || new Date().toISOString(),
        },
        ...rawHistory,
      ];

  return {
    id: dto.taskId || dto.id,
    taskId: dto.taskId || dto.id,
    record: dto.recordNo || dto.record || 'N/A',
    recordNo: dto.recordNo || dto.record || 'N/A',
    sop: dto.sopTitle || dto.sop || 'N/A',
    sopTitle: dto.sopTitle || dto.sop || 'N/A',
    entity: dto.entityName || dto.entity || dto.entityCode || 'N/A',
    entityName: dto.entityName || dto.entity || dto.entityCode || 'N/A',
    entityCode: dto.entityCode || dto.entityId,
    period: dto.periodKey || dto.period || 'N/A',
    periodKey: dto.periodKey || dto.period || 'N/A',
    maker: makerList.join(', '),
    makerName: makerList.join(', '),
    makerId: dto.makerId,
    assignedMakers: makerList,
    assignedMakerNames: makerList,
    lockedMaker: lockedMaker,
    actualMaker: lockedMaker,
    checker: checkerList.join(', '),
    checkerName: checkerList.join(', '),
    checkerId: dto.checkerId,
    assignedCheckers: checkerList,
    assignedCheckerNames: checkerList,
    lockedChecker: lockedChecker,
    actualChecker: lockedChecker,
    dueDate: dto.dueDate || 'N/A',
    daysOverdue: dto.daysOverdue || 0,
    status: dto.status || 'OPEN',
    history: historyList,
  };
}

export function mapSop(dto) {
  if (!dto) return null;
  const defaultMakers = ['Tushar Seth', 'Vivek Raj'];
  const defaultCheckers = ['Mainak Gupta', 'Vivek Raj'];

  const makers = (dto.defaultMakerNames && dto.defaultMakerNames.length > 0)
    ? dto.defaultMakerNames
    : (dto.defaultMakerName ? [dto.defaultMakerName] : defaultMakers);

  const checkers = (dto.defaultCheckerNames && dto.defaultCheckerNames.length > 0)
    ? dto.defaultCheckerNames
    : (dto.defaultCheckerName ? [dto.defaultCheckerName] : defaultCheckers);

  return {
    id: dto.sopId || dto.id,
    code: dto.sopCode || dto.code || 'N/A',
    name: dto.title || dto.name || 'N/A',
    process: dto.processCategory || dto.process || 'N/A',
    entity: dto.entityName || dto.entity || dto.entityCode || 'N/A',
    entityCode: dto.entityCode || dto.entityId,
    frequency: dto.frequency || 'MONTHLY',
    dueDay: dto.dueDayOffset ?? dto.dueDay ?? 1,
    isRecurring: dto.isRecurring !== undefined ? !!dto.isRecurring : false,
    maker: makers.join(', '),
    checker: checkers.join(', '),
    makers: makers,
    checkers: checkers,
    defaultMakerNames: makers,
    defaultCheckerNames: checkers,
    defaultMakerIds: dto.defaultMakerIds || [],
    defaultCheckerIds: dto.defaultCheckerIds || [],
    assignedCreatorId: dto.assignedCreatorId,
    assignedCreatorName: dto.assignedCreatorName || dto.assignedCreatorId,
    assignedApproverId: dto.assignedApproverId,
    assignedApproverName: dto.assignedApproverName || dto.assignedApproverId,
    rejectionReason: dto.rejectionReason,
    status: dto.status || 'ACTIVE',
    version: dto.version || dto.versionNumber || 1,
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

export async function getTasks(selectedEntities = [], currentUser = null) {
  const params = new URLSearchParams();
  if (selectedEntities.length > 0) params.append('entities', selectedEntities.join(','));
  if (currentUser?.id) params.append('userId', currentUser.id);
  if (currentUser?.role) params.append('userRole', currentUser.role);
  const query = params.toString() ? `?${params.toString()}` : '';
  const list = await fetchJson(`/tasks${query}`).catch(() => null);
  if (Array.isArray(list)) {
    return list.map(mapTask);
  }
  return [];
}

export async function getInboxTasks(selectedEntities = [], status = null, userId = null) {
  const params = new URLSearchParams();
  if (selectedEntities.length > 0) params.append('entities', selectedEntities.join(','));
  if (status) params.append('status', status);
  if (userId) params.append('userId', userId);
  const query = params.toString() ? `?${params.toString()}` : '';
  const result = await fetchJson(`/tasks/inbox${query}`).catch(() => null);
  if (result && Array.isArray(result.content)) {
    return result.content.map(mapTask);
  }
  if (Array.isArray(result)) {
    return result.map(mapTask);
  }
  return [];
}

export async function getSops(selectedEntities = [], currentUser = null) {
  const params = new URLSearchParams();
  if (selectedEntities.length > 0) params.append('entities', selectedEntities.join(','));
  if (currentUser?.id) params.append('userId', currentUser.id);
  if (currentUser?.role) params.append('userRole', currentUser.role);
  const query = params.toString() ? `?${params.toString()}` : '';
  const list = await fetchJson(`/sops${query}`).catch(() => null);
  if (Array.isArray(list)) {
    return list.map(mapSop);
  }
  return [];
}

export async function getAuditLogs() {
  const list = await fetchJson('/audit-logs').catch(() => null);
  if (Array.isArray(list)) {
    return list;
  }
  return [];
}

export async function assignSop(assignData) {
  const res = await fetchJson('/sops/assign', {
    method: 'POST',
    body: JSON.stringify(assignData),
  }).catch(() => null);

  return res ? mapSop(res) : null;
}

export async function submitSopDraft(sopId, draftData) {
  const res = await fetchJson(`/sops/${sopId}/submit`, {
    method: 'PUT',
    body: JSON.stringify(draftData),
  }).catch(() => null);

  return res ? mapSop(res) : null;
}

export async function actionSop(sopId, actionData) {
  const res = await fetchJson(`/sops/${sopId}/action`, {
    method: 'PUT',
    body: JSON.stringify(actionData),
  }).catch(() => null);

  return res ? mapSop(res) : null;
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
  
  let allUsers = (Array.isArray(res) && res.length > 0) ? res.map(u => ({
    id: u.userId || u.id,
    name: u.fullName || u.name,
    email: u.email,
    role: u.role,
    groups: u.groups || u.oidcGroups || [],
  })) : MOCK_ORGANIZATION_USERS;

  if (targetRole) {
    const roleUpper = targetRole.toUpperCase().trim();
    allUsers = allUsers.filter(u => {
      // ADMIN is eligible for both MAKER and CHECKER
      if (u.role === 'ADMIN' || u.groups?.includes('fin_sop_admin')) return true;

      // Vivek Raj is eligible for both MAKER and CHECKER
      if (u.id === 'usr-vivek-108' || u.name === 'Vivek Raj') return true;

      if (roleUpper === 'MAKER') {
        const isMakerRole = u.role === 'MAKER';
        const hasMakerGroup = u.groups?.some(g => g.toLowerCase().includes('maker'));
        return isMakerRole || hasMakerGroup;
      }
      if (roleUpper === 'CHECKER') {
        const isCheckerRole = u.role === 'CHECKER';
        const hasCheckerGroup = u.groups?.some(g => g.toLowerCase().includes('checker'));
        return isCheckerRole || hasCheckerGroup;
      }
      return true;
    });
  }

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

  const res = await fetchJson(`/tasks/${id}/action`, {
    method: 'PUT',
    body: JSON.stringify({ action: 'SUBMIT', actorId: actor, comment: comm }),
  }).catch(() => null);

  const mock = MOCK_TASKS.find(t => t.taskId === id || t.id === id || t.recordNo === id);
  if (mock) {
    const fromStatus = mock.status;
    mock.status = 'PENDING_REVIEW';
    const actorName = actor === 'usr-prayasa-410' ? 'Prayasa Sharma' : (actor === 'usr-vivek-108' ? 'Vivek Raj' : 'Tushar Seth');
    mock.actualMaker = actorName;
    mock.makerName = actorName;
    mock.maker = actorName;
    mock.lastComment = comm;
    if (!mock.history) mock.history = [];
    mock.history.push({
      eventId: Date.now(),
      action: fromStatus === 'REJECTED' ? 'RESUBMIT' : 'SUBMIT',
      actorName: actorName,
      fromStatus: fromStatus,
      toStatus: 'PENDING_REVIEW',
      comment: comm || 'Submitted task for review',
      timestamp: new Date().toISOString(),
    });
  }
  return res || (mock ? mapTask(mock) : null);
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

  const res = await fetchJson(`/tasks/${id}/action`, {
    method: 'PUT',
    body: JSON.stringify({ action: 'APPROVE', actorId: actor, comment: comm }),
  }).catch(() => null);

  const mock = MOCK_TASKS.find(t => t.taskId === id || t.id === id || t.recordNo === id);
  if (mock) {
    const fromStatus = mock.status;
    mock.status = 'APPROVED';
    const actorName = actor === 'usr-vivek-108' ? 'Vivek Raj' : (actor === 'usr-manoj-042' ? 'Manoj Agarwal' : 'Mainak Gupta');
    mock.actualChecker = actorName;
    mock.checkerName = actorName;
    mock.checker = actorName;
    mock.lastComment = comm;
    if (!mock.history) mock.history = [];
    mock.history.push({
      eventId: Date.now(),
      action: 'APPROVE',
      actorName: actorName,
      fromStatus: fromStatus,
      toStatus: 'APPROVED',
      comment: comm || 'Approved task',
      timestamp: new Date().toISOString(),
    });
  }
  return res || (mock ? mapTask(mock) : null);
}

export async function rejectTask(taskId, actorId = 'usr-mainak-215', comment = 'Requires correction', permanentRejection = false) {
  let id = taskId;
  let actor = actorId;
  let comm = comment;
  let isPermanent = permanentRejection;

  if (typeof taskId === 'object' && taskId !== null) {
    id = taskId.taskId || taskId.id || taskId.recordNo;
    if (typeof actorId === 'string' && typeof comment !== 'string') {
      isPermanent = !!comment;
      comm = actorId;
      actor = 'usr-mainak-215';
    }
  }

  const res = await fetchJson(`/tasks/${id}/action`, {
    method: 'PUT',
    body: JSON.stringify({ action: isPermanent ? 'PERMANENT_REJECT' : 'REJECT', actorId: actor, comment: comm, permanentRejection: isPermanent }),
  }).catch(() => null);

  const mock = MOCK_TASKS.find(t => t.taskId === id || t.id === id || t.recordNo === id);
  if (mock) {
    const fromStatus = mock.status;
    mock.status = isPermanent ? 'PERMANENTLY_REJECTED' : 'REJECTED';
    const actorName = actor === 'usr-vivek-108' ? 'Vivek Raj' : (actor === 'usr-manoj-042' ? 'Manoj Agarwal' : 'Mainak Gupta');
    mock.actualChecker = actorName;
    mock.checkerName = actorName;
    mock.checker = actorName;
    mock.lastComment = comm;
    if (!mock.history) mock.history = [];
    mock.history.push({
      eventId: Date.now(),
      action: isPermanent ? 'PERMANENT_REJECT' : 'REJECT',
      actorName: actorName,
      fromStatus: fromStatus,
      toStatus: mock.status,
      comment: comm || 'Task rejected',
      timestamp: new Date().toISOString(),
    });
  }
  return res || (mock ? mapTask(mock) : null);
}

export async function updateSop(sopId, sopData) {
  const res = await fetchJson(`/sops/${sopId}`, {
    method: 'PUT',
    body: JSON.stringify(sopData),
  }).catch(() => null);

  const targetIdx = MOCK_SOPS.findIndex(s => s.sopId === sopId || s.id === sopId || s.sopCode === sopData.sopCode || s.code === sopData.sopCode);
  if (targetIdx !== -1) {
    const existing = MOCK_SOPS[targetIdx];
    const prevStatus = existing.status;
    const updatedMakers = (sopData.defaultMakerNames || sopData.defaultMakerIds || []).map(m => m.replace('usr-', '').replace(/\b\w/g, l => l.toUpperCase()));
    const updatedCheckers = (sopData.defaultCheckerNames || sopData.defaultCheckerIds || []).map(c => c.replace('usr-', '').replace(/\b\w/g, l => l.toUpperCase()));

    const currentVersion = existing.version || 1;
    const actorId = sopData.createdById || 'usr-tushar-304';
    const actorName = actorId === 'usr-tushar-304' ? 'Tushar Seth' : (actorId === 'usr-prayasa-410' ? 'Prayasa Sharma' : 'Manoj Agarwal');
    const approverId = existing.assignedApproverId || 'usr-vivek-108';
    const approverName = existing.assignedApproverName || 'Vivek Raj';

    if (!existing.history) existing.history = [];
    existing.history.push({
      eventId: Date.now(),
      action: 'UPDATE_SOP',
      actorId: actorId,
      actorName: actorName,
      actorRole: 'MAKER',
      fromStatus: prevStatus,
      toStatus: 'PENDING_APPROVAL',
      comment: `SOP modified by ${actorName} and resubmitted for approval`,
      timestamp: new Date().toISOString(),
    });

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
      status: 'PENDING_APPROVAL',
      version: currentVersion,
      history: existing.history,
    };

    // Dispatch custom notification event for in-app notification bell
    try {
      const notifEvent = new CustomEvent('add-notification', {
        detail: {
          recipientUserId: approverId,
          recipientName: approverName,
          title: 'SOP Modified — Approval Required',
          message: `SOP ${existing.sopCode || existing.code} (${sopData.title || existing.title}) was modified by ${actorName} and requires your approval.`,
          referenceEntityType: 'SOP',
          referenceEntityId: existing.sopId || existing.id || existing.code,
          timestamp: new Date().toISOString(),
        }
      });
      window.dispatchEvent(notifEvent);
    } catch (e) {
      // Ignore if SSR
    }

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

export async function generateScheduledTasks() {
  const res = await fetchJson('/tasks/generate-scheduled', {
    method: 'POST',
  }).catch(() => null);
  return res || { status: 'SUCCESS', message: 'Tasks generated successfully' };
}

export async function verifyGoogleSsoToken(idToken) {
  return await fetchJson('/auth/google-sso', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  }).catch(() => null);
}

export async function getUserNotifications(userId) {
  if (!userId) return [];
  const res = await fetchJson(`/notifications/user/${userId}`).catch(() => null);
  const list = Array.isArray(res) ? res : (res && Array.isArray(res.data) ? res.data : []);
  return list;
}

export async function getUnreadNotificationCount(userId) {
  if (!userId) return 0;
  const res = await fetchJson(`/notifications/user/${userId}/unread-count`).catch(() => null);
  return res?.unreadCount ?? res?.data?.unreadCount ?? 0;
}

export async function markNotificationAsRead(notificationId) {
  if (!notificationId) return null;
  const res = await fetchJson(`/notifications/${notificationId}/read`, {
    method: 'PUT',
  }).catch(() => null);
  return res?.data || res;
}

export async function markAllNotificationsAsRead(userId) {
  if (!userId) return null;
  const res = await fetchJson(`/notifications/user/${userId}/read-all`, {
    method: 'PUT',
  }).catch(() => null);
  return res?.data || res;
}

export async function deleteNotification(notificationId) {
  if (!notificationId) return null;
  const res = await fetchJson(`/notifications/${notificationId}`, {
    method: 'DELETE',
  }).catch(() => null);
  return res?.data || res;
}

export async function getUserCategoryPermissions(userId) {
  if (!userId) return [];
  const res = await fetchJson(`/admin/permissions/user/${userId}`).catch(() => null);
  return Array.isArray(res) ? res : (res?.data || []);
}

export async function grantCategoryPermission(requestData) {
  const res = await fetchJson(`/admin/permissions/grant`, {
    method: 'POST',
    body: JSON.stringify(requestData),
  });
  return res?.data || res;
}

export async function revokeCategoryPermission(userId, processCategory) {
  const res = await fetchJson(`/admin/permissions/user/${userId}/category/${encodeURIComponent(processCategory)}`, {
    method: 'DELETE',
  }).catch(() => null);
  return res?.data || res;
}

export async function getProcessCategories() {
  const res = await fetchJson('/process-categories').catch(() => []);
  const list = Array.isArray(res) ? res : (res?.data || []);
  return list;
}

export async function createProcessCategory(categoryData) {
  const res = await fetchJson('/process-categories', {
    method: 'POST',
    body: JSON.stringify(categoryData),
  });
  return res?.data || res;
}

export async function updateProcessCategory(categoryCode, categoryData) {
  const res = await fetchJson(`/process-categories/${encodeURIComponent(categoryCode)}`, {
    method: 'PUT',
    body: JSON.stringify(categoryData),
  });
  return res?.data || res;
}

export async function deleteProcessCategory(categoryCode) {
  const res = await fetchJson(`/process-categories/${encodeURIComponent(categoryCode)}`, {
    method: 'DELETE',
  }).catch(() => null);
  return res?.data || res;
}

export async function getCategoryActivityLogs(categoryCode) {
  if (!categoryCode) return [];
  const res = await fetchJson(`/process-categories/${encodeURIComponent(categoryCode)}/activity-logs`).catch(() => []);
  return Array.isArray(res) ? res : (res?.data || []);
}

export async function getCategoryAccessAssignments(categoryCode) {
  if (!categoryCode) return null;
  const res = await fetchJson(`/admin/permissions/category/${encodeURIComponent(categoryCode)}`).catch(() => null);
  return res?.data || res;
}

export async function saveCategoryAccessAssignments(assignmentData) {
  const res = await fetchJson('/admin/permissions/category/assign', {
    method: 'POST',
    body: JSON.stringify(assignmentData),
  });
  return res?.data || res;
}

export async function getAccessControlActivityLogs(categoryCode = null) {
  const query = categoryCode ? `?processCategory=${encodeURIComponent(categoryCode)}` : '';
  const res = await fetchJson(`/admin/permissions/activity-logs${query}`).catch(() => []);
  return Array.isArray(res) ? res : (res?.data || []);
}

