const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'finsop_db',
  user: process.env.DB_USER || 'finsop_user',
  password: process.env.DB_PASSWORD || 'finsop_password',
  max: 5,
  idleTimeoutMillis: 30000,
});

exports.handleReconciliation = async (req, res) => {
  console.log('[Reconciler] Running 6-hour sparse audit check for broken event chains on sop_versions...');

  const client = await pool.connect();
  try {
    // Query sop_versions where is_running = true AND next_expected_execution_at is more than 30 minutes in the past
    const graceCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const brokenChains = await client.query(
      `SELECT v.version_id, v.sop_id, v.version_number, v.frequency, v.start_date_time, v.due_date_time, v.next_expected_execution_at, s.sop_code 
       FROM sop_versions v
       JOIN sops s ON v.sop_id = s.sop_id
       WHERE v.is_running = true 
         AND v.version_status = 'APPROVED'
         AND v.next_expected_execution_at IS NOT NULL 
         AND v.next_expected_execution_at < $1`,
      [graceCutoff]
    );

    if (brokenChains.rows.length === 0) {
      console.log('[Reconciler] Clean health check! 0 broken task chains detected.');
      return res.status(200).send({ status: 'HEALTHY', brokenChainsCount: 0 });
    }

    console.warn(`[Reconciler] ALERT: Found ${brokenChains.rows.length} broken task chain(s). Healing...`);

    let healedCount = 0;
    for (const version of brokenChains.rows) {
      const periodKey = calculatePeriodKey(version.frequency, new Date());
      const nowTime = new Date();

      // Write missing outbox row to heal chain
      await client.query(
        `INSERT INTO task_outbox (outbox_id, sop_version_id, period_key, schedule_time, kind, created_at)
         VALUES ($1, $2, $3, $4, 'TASK', NOW())`,
        [uuidv4(), version.version_id, periodKey, nowTime.toISOString()]
      );

      // Reset expected execution to now to clear alert status
      await client.query(
        'UPDATE sop_versions SET next_expected_execution_at = $1 WHERE version_id = $2',
        [nowTime.toISOString(), version.version_id]
      );

      healedCount++;
      console.log(`[Reconciler] Healed broken chain for SOP [${version.sop_code}] Version [${version.version_number}] period [${periodKey}]`);
    }

    return res.status(200).send({
      status: 'HEALED',
      brokenChainsCount: brokenChains.rows.length,
      healedCount: healedCount,
    });
  } catch (err) {
    console.error('[Reconciler] Reconciliation run failed:', err);
    return res.status(500).send({ error: err.message });
  } finally {
    client.release();
  }
};

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
