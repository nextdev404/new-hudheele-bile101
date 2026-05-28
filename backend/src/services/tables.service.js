const { query } = require("../config/db");
const { emitEvent } = require("../lib/socket");

async function listTables(context) {
  const { rows } = await query(
    "SELECT id, table_code AS id_code, display_name, status, locked_by, waiter_name FROM tables WHERE tenant_id = $1 AND branch_id = $2 ORDER BY table_code ASC",
    [context.tenantId, context.branchId]
  );
  return rows.map((r) => ({
    id: r.id_code,
    displayName: r.display_name,
    status: r.status,
    lockedBy: r.locked_by,
    waiterName: r.waiter_name,
  }));
}

async function openTable(tableCode, user, context) {
  const lockResult = await query(
    `UPDATE tables
     SET status = 'Occupied', locked_by = $1, waiter_name = $2, display_name = $2, opened_at = NOW()
     WHERE table_code = $3 AND tenant_id = $4 AND branch_id = $5 AND status = 'Available'
     RETURNING id, table_code, status, locked_by, waiter_name`,
    [user.userId, user.name, tableCode, context.tenantId, context.branchId]
  );

  if (!lockResult.rows[0]) {
    const current = await query(
      "SELECT table_code, status, locked_by, waiter_name FROM tables WHERE table_code = $1 AND tenant_id = $2 AND branch_id = $3",
      [tableCode, context.tenantId, context.branchId]
    );
    return current.rows[0] || null;
  }

  emitEvent("tables.updated", { tableCode });
  return lockResult.rows[0];
}

async function addTables(context, count) {
  const amount = Number(count);
  if (!Number.isInteger(amount) || amount < 1 || amount > 50) {
    const error = new Error("count must be an integer between 1 and 50");
    error.status = 400;
    throw error;
  }

  const { rows } = await query(
    `SELECT table_code
     FROM tables
     WHERE tenant_id = $1 AND branch_id = $2`,
    [context.tenantId, context.branchId]
  );

  const existingNumbers = rows
    .map((row) => Number.parseInt(String(row.table_code).replace(/^T/i, ""), 10))
    .filter((n) => Number.isFinite(n));

  let nextId = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

  for (let i = 0; i < amount; i += 1) {
    const tableCode = `T${nextId}`;
    await query(
      `INSERT INTO tables (table_code, display_name, status, tenant_id, branch_id)
       VALUES ($1, 'Available', 'Available', $2, $3)
       ON CONFLICT (table_code) DO NOTHING`,
      [tableCode, context.tenantId, context.branchId]
    );
    nextId += 1;
  }

  return listTables(context);
}

async function releaseTable(tableCode, context) {
  const result = await query(
    `UPDATE tables
     SET status = 'Available', locked_by = NULL, waiter_name = NULL, display_name = 'Available', opened_at = NULL
     WHERE table_code = $1 AND tenant_id = $2 AND branch_id = $3
     RETURNING table_code, status`,
    [tableCode, context.tenantId, context.branchId]
  );
  if (result.rows[0]) {
    emitEvent("tables.updated", { tableCode });
  }
  return result.rows[0] || null;
}

module.exports = {
  listTables,
  addTables,
  openTable,
  releaseTable,
};
