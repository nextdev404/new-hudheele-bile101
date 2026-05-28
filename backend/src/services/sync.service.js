const { Pool } = require("pg");
const { pool: localPool } = require("../config/db");
const { env } = require("../config/env");

const TABLE_CONFIGS = [
  {
    table: "orders",
    key: "id",
    columns: [
      "id",
      "table_id",
      "waiter_id",
      "waiter_name",
      "status",
      "created_at",
      "updated_at",
      "paid_at",
      "tenant_id",
      "branch_id",
      "sync_version",
      "synced_at",
    ],
    syncFilterColumn: "created_at",
  },
  {
    table: "order_items",
    key: "id",
    columns: [
      "id",
      "order_id",
      "product_id",
      "product_name",
      "qty",
      "price",
      "created_at",
      "tenant_id",
      "branch_id",
      "synced_at",
    ],
    syncFilterColumn: "created_at",
  },
  {
    table: "payments",
    key: "id",
    columns: [
      "id",
      "order_id",
      "method",
      "amount",
      "paid_by",
      "created_at",
      "tenant_id",
      "branch_id",
      "synced_at",
    ],
    syncFilterColumn: "created_at",
  },
  {
    table: "products",
    key: "id",
    columns: [
      "id",
      "category_id",
      "name",
      "price",
      "image",
      "available_quantity",
      "availability_status",
      "created_at",
      "updated_at",
      "tenant_id",
      "branch_id",
      "synced_at",
    ],
    syncFilterColumn: "updated_at",
  },
  {
    table: "tables",
    key: "id",
    columns: [
      "id",
      "table_code",
      "display_name",
      "status",
      "locked_by",
      "waiter_name",
      "opened_at",
      "created_at",
      "updated_at",
      "tenant_id",
      "branch_id",
      "synced_at",
    ],
    syncFilterColumn: "updated_at",
  },
  {
    table: "inventory_events",
    key: "id",
    columns: [
      "id",
      "product_id",
      "event_type",
      "previous_qty",
      "new_qty",
      "performed_by",
      "created_at",
      "tenant_id",
      "branch_id",
      "synced_at",
    ],
    syncFilterColumn: "created_at",
  },
  {
    table: "audit_logs",
    key: "id",
    columns: ["id", "action", "payload", "performed_by", "created_at", "tenant_id", "branch_id", "synced_at"],
    syncFilterColumn: "created_at",
  },
];

const syncState = {
  running: false,
  lastRunStartedAt: null,
  lastRunFinishedAt: null,
  lastSuccessAt: null,
  lastError: null,
  lastSummary: null,
};

let cloudPool = null;

function getCloudPool() {
  if (!env.cloudDatabaseUrl) return null;
  if (!cloudPool) {
    cloudPool = new Pool({ connectionString: env.cloudDatabaseUrl });
  }
  return cloudPool;
}

function getSyncStatus() {
  return {
    ...syncState,
    configured: Boolean(env.cloudDatabaseUrl),
    intervalHours: env.syncIntervalHours,
    batchSize: env.syncBatchSize,
  };
}

function buildUpsertQuery(tableCfg, rows) {
  const cols = tableCfg.columns;
  const valueGroups = [];
  const values = [];

  rows.forEach((row, rowIndex) => {
    const placeholders = cols.map((_, colIndex) => `$${rowIndex * cols.length + colIndex + 1}`);
    valueGroups.push(`(${placeholders.join(", ")})`);
    cols.forEach((c) => values.push(row[c]));
  });

  const updates = cols
    .filter((c) => c !== tableCfg.key)
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(", ");

  const sql = `
    INSERT INTO ${tableCfg.table} (${cols.join(", ")})
    VALUES ${valueGroups.join(", ")}
    ON CONFLICT (${tableCfg.key}) DO UPDATE SET ${updates}
  `;

  return { sql, values };
}

async function syncTable(tableCfg, contextFilter = null) {
  const cloud = getCloudPool();
  if (!cloud) {
    return { table: tableCfg.table, synced: 0, skipped: true };
  }

  const params = [];
  let where = "synced_at IS NULL";
  if (contextFilter?.tenantId) {
    params.push(contextFilter.tenantId);
    where += ` AND tenant_id = $${params.length}`;
  }
  if (contextFilter?.branchId) {
    params.push(contextFilter.branchId);
    where += ` AND branch_id = $${params.length}`;
  }
  params.push(env.syncBatchSize);

  const selectSql = `
    SELECT ${tableCfg.columns.join(", ")}
    FROM ${tableCfg.table}
    WHERE ${where}
    ORDER BY ${tableCfg.syncFilterColumn} ASC
    LIMIT $${params.length}
  `;
  const localRows = (await localPool.query(selectSql, params)).rows;
  if (localRows.length === 0) {
    return { table: tableCfg.table, synced: 0 };
  }

  const { sql, values } = buildUpsertQuery(tableCfg, localRows);
  const cloudClient = await cloud.connect();
  try {
    await cloudClient.query("BEGIN");
    await cloudClient.query(sql, values);
    await cloudClient.query("COMMIT");
  } catch (error) {
    await cloudClient.query("ROLLBACK");
    throw error;
  } finally {
    cloudClient.release();
  }

  const ids = localRows.map((r) => r[tableCfg.key]);
  await localPool.query(
    `UPDATE ${tableCfg.table} SET synced_at = NOW() WHERE ${tableCfg.key} = ANY($1::bigint[])`,
    [ids]
  );

  return { table: tableCfg.table, synced: localRows.length };
}

async function runSyncJob(options = {}) {
  if (syncState.running) {
    return { ok: false, reason: "sync_already_running", status: getSyncStatus() };
  }

  syncState.running = true;
  syncState.lastError = null;
  syncState.lastRunStartedAt = new Date().toISOString();
  const summary = [];

  try {
    for (const tableCfg of TABLE_CONFIGS) {
      const result = await syncTable(tableCfg, options.contextFilter || null);
      summary.push(result);
    }
    syncState.lastSummary = summary;
    syncState.lastSuccessAt = new Date().toISOString();
    return { ok: true, summary };
  } catch (error) {
    syncState.lastError = error.message || "Unknown sync error";
    return { ok: false, error: syncState.lastError, summary };
  } finally {
    syncState.lastRunFinishedAt = new Date().toISOString();
    syncState.running = false;
  }
}

function startScheduledSync() {
  const intervalMs = Math.max(env.syncIntervalHours, 1) * 60 * 60 * 1000;
  setInterval(() => {
    runSyncJob().catch((error) => {
      syncState.lastError = error.message || "Scheduled sync failed";
    });
  }, intervalMs);
}

module.exports = {
  runSyncJob,
  startScheduledSync,
  getSyncStatus,
};
