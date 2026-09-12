const { CloudTasksClient } = require('@google-cloud/tasks');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'finsop_db',
  user: process.env.DB_USER || 'finsop_user',
  password: process.env.DB_PASSWORD || 'finsop_password',
  max: 10,
  idleTimeoutMillis: 30000,
});

const tasksClient = new CloudTasksClient();
const CHECKPOINT_HORIZON_SECONDS = 25 * 24 * 60 * 60; // 25 days safety limit

exports.handleTaskExecution = async (req, res) => {
  const { sopVersionId, periodKey, isCheckpoint, targetTime } = req.body || {};

  if (!sopVersionId || !periodKey) {
    return res.status(400).send({ error: 'Missing required parameters: sopVersionId, periodKey' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Validate SOP Version status & running flag (Authoritative Guard)
    const versionRes = await client.query(
      `SELECT v.version_id, v.sop_id, v.version_number, v.frequency, v.start_date_time, v.due_date_time, v.is_running, v.version_status, s.sop_code 
       FROM sop_versions v
       JOIN sops s ON v.sop_id = s.sop_id
       WHERE v.version_id = $1 AND v.is_running = true AND v.version_status = 'APPROVED'`,
      [sopVersionId]
    );

    if (versionRes.rows.length === 0) {
      console.log(`[Worker] SOP Version [${sopVersionId}] is no longer active. Skipping execution.`);
      await client.query('COMMIT');
      return res.status(200).send({ status: 'SKIPPED_INACTIVE' });
    }

    const version = versionRes.rows[0];

    // 2. Handle Checkpoint Hop if applicable
    if (isCheckpoint) {
      const nowMs = Date.now();
      const targetMs = new Date(targetTime).getTime();
      const secondsRemaining = (targetMs - nowMs) / 1000;

      if (secondsRemaining > CHECKPOINT_HORIZON_SECONDS) {
        // Enqueue another Checkpoint Hop
        const nextCheckpointTime = new Date(nowMs + CHECKPOINT_HORIZON_SECONDS * 1000);
        await writeOutbox(client, sopVersionId, periodKey, nextCheckpointTime, 'CHECKPOINT', targetTime);
        await client.query('COMMIT');
        console.log(`[Worker] Re-enqueued CHECKPOINT for SOP [${version.sop_code}] Version [${version.version_number}] at [${nextCheckpointTime.toISOString()}]`);
        return res.status(200).send({ status: 'CHECKPOINT_RE_ENQUEUED' });
      }
    }

    // 3. Atomic Task Creation with ON CONFLICT DO NOTHING using explicit due_date_time
    const recordNo = `${version.sop_code}-${periodKey}`;
    const dueDate = new Date(version.due_date_time);

    const insertRes = await client.query(
      `INSERT INTO tasks (task_id, sop_id, sop_version_id, record_no, period_key, status, due_date, created_at, updated_at, version)
       VALUES ($1, $2, $3, $4, $5, 'OPEN', $6, NOW(), NOW(), 0)
       ON CONFLICT (sop_version_id, period_key) DO NOTHING
       RETURNING task_id`,
      [uuidv4(), version.sop_id, sopVersionId, recordNo, periodKey, dueDate.toISOString()]
    );

    if (insertRes.rows.length === 0) {
      console.log(`[Worker] Duplicate task delivery for SOP [${version.sop_code}] Version [${version.version_number}] period [${periodKey}]. Skipped.`);
      await client.query('COMMIT');
      return res.status(200).send({ status: 'SKIPPED_DUPLICATE' });
    }

    // 4. Calculate Next Execution Target & Write Outbox Row in SAME Transaction
    const baseDate = new Date(version.start_date_time);
    const nextExecutionAt = calculateNextRun(version.frequency, baseDate);
    const nextPeriodKey = calculatePeriodKey(version.frequency, nextExecutionAt);

    const secondsAway = (nextExecutionAt.getTime() - Date.now()) / 1000;

    if (secondsAway > CHECKPOINT_HORIZON_SECONDS) {
      const checkpointTime = new Date(Date.now() + CHECKPOINT_HORIZON_SECONDS * 1000);
      await writeOutbox(client, sopVersionId, nextPeriodKey, checkpointTime, 'CHECKPOINT', nextExecutionAt.toISOString());
    } else {
      await writeOutbox(client, sopVersionId, nextPeriodKey, nextExecutionAt, 'TASK', null);
    }

    // Update next expected execution in sop_versions
    await client.query(
      'UPDATE sop_versions SET next_expected_execution_at = $1 WHERE version_id = $2',
      [nextExecutionAt.toISOString(), sopVersionId]
    );

    await client.query('COMMIT');
    console.log(`[Worker] Task [${recordNo}] created successfully for SOP Version [${version.version_number}]. Next run: [${nextExecutionAt.toISOString()}]`);
    return res.status(200).send({ status: 'SUCCESS', recordNo });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Worker] Transaction failed:', err);
    return res.status(500).send({ error: err.message });
  } finally {
    client.release();
  }
};

async function writeOutbox(client, sopVersionId, periodKey, scheduleTime, kind, targetTime) {
  await client.query(
    `INSERT INTO task_outbox (outbox_id, sop_version_id, period_key, schedule_time, kind, target_time, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [uuidv4(), sopVersionId, periodKey, scheduleTime.toISOString(), kind, targetTime]
  );
}

function calculateNextRun(frequency, baseDate) {
  const d = new Date(baseDate);
  const now = new Date();
  while (d <= now) {
    if (frequency === 'DAILY') {
      d.setDate(d.getDate() + 1);
    } else if (frequency === 'WEEKLY') {
      d.setDate(d.getDate() + 7);
    } else if (frequency === 'MONTHLY') {
      d.setMonth(d.getMonth() + 1);
    } else if (frequency === 'QUARTERLY') {
      d.setMonth(d.getMonth() + 3);
    } else if (frequency === 'YEARLY') {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setDate(d.getDate() + 1);
    }
  }
  return d;
}

function calculatePeriodKey(frequency, dateObj) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');

  if (frequency === 'DAILY') return `${yyyy}-${mm}-${dd}`;
  if (frequency === 'MONTHLY') return `${yyyy}-M${mm}`;
  if (frequency === 'QUARTERLY') {
    const q = Math.floor(dateObj.getMonth() / 3) + 1;
    return `${yyyy}-Q${q}`;
  }
  if (frequency === 'YEARLY') return `${yyyy}-Y${yyyy}`;
  return `${yyyy}-${mm}-${dd}`;
}
