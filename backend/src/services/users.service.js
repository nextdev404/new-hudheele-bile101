const bcrypt = require("bcryptjs");
const { query } = require("../config/db");

const ALLOWED_ROLES = ["Admin", "Manager", "Waiter", "Chef", "Cashier", "Customer"];
const ALLOWED_STATUSES = ["Active", "Offline", "Inactive"];

function mapUserRow(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    status: row.status,
    tenantId: row.tenant_id,
    branchId: row.branch_id,
    avatar: row.name.replace(/ /g, "+"),
  };
}

async function listUsers(context) {
  const { rows } = await query(
    `SELECT id, name, role, status, tenant_id, branch_id
     FROM users
     WHERE tenant_id = $1 AND branch_id = $2
     ORDER BY id ASC`,
    [context.tenantId, context.branchId]
  );
  return rows.map(mapUserRow);
}

async function createUser(context, { name, role, pin, status = "Offline" }) {
  if (!name || !role || !pin) {
    const error = new Error("name, role, and pin are required");
    error.status = 400;
    throw error;
  }
  if (!ALLOWED_ROLES.includes(role)) {
    const error = new Error("Invalid role");
    error.status = 400;
    throw error;
  }
  if (!ALLOWED_STATUSES.includes(status)) {
    const error = new Error("Invalid status");
    error.status = 400;
    throw error;
  }

  const pinHash = await bcrypt.hash(pin, 10);
  try {
    const { rows } = await query(
      `INSERT INTO users (name, role, status, pin_hash, tenant_id, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, role, status, tenant_id, branch_id`,
      [name.trim(), role, status, pinHash, context.tenantId, context.branchId]
    );
    return mapUserRow(rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      const duplicate = new Error("A user with this name already exists");
      duplicate.status = 409;
      throw duplicate;
    }
    throw error;
  }
}

async function updateUser(context, userId, { name, role, pin, status }) {
  const { rows: existingRows } = await query(
    `SELECT id, name, role, status
     FROM users
     WHERE id = $1 AND tenant_id = $2 AND branch_id = $3
     LIMIT 1`,
    [userId, context.tenantId, context.branchId]
  );
  const existing = existingRows[0];
  if (!existing) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  const nextName = name !== undefined ? name.trim() : existing.name;
  const nextRole = role !== undefined ? role : existing.role;
  const nextStatus = status !== undefined ? status : existing.status;

  if (!nextName) {
    const error = new Error("name is required");
    error.status = 400;
    throw error;
  }
  if (!ALLOWED_ROLES.includes(nextRole)) {
    const error = new Error("Invalid role");
    error.status = 400;
    throw error;
  }
  if (!ALLOWED_STATUSES.includes(nextStatus)) {
    const error = new Error("Invalid status");
    error.status = 400;
    throw error;
  }

  if (existing.role === "Admin" && nextRole !== "Admin") {
    const error = new Error("Cannot change Admin role");
    error.status = 400;
    throw error;
  }

  let pinHash = null;
  if (pin) {
    pinHash = await bcrypt.hash(pin, 10);
  }

  const { rows } = await query(
    pinHash
      ? `UPDATE users
         SET name = $1, role = $2, status = $3, pin_hash = $4, updated_at = NOW()
         WHERE id = $5 AND tenant_id = $6 AND branch_id = $7
         RETURNING id, name, role, status, tenant_id, branch_id`
      : `UPDATE users
         SET name = $1, role = $2, status = $3, updated_at = NOW()
         WHERE id = $4 AND tenant_id = $5 AND branch_id = $6
         RETURNING id, name, role, status, tenant_id, branch_id`,
    pinHash
      ? [nextName, nextRole, nextStatus, pinHash, userId, context.tenantId, context.branchId]
      : [nextName, nextRole, nextStatus, userId, context.tenantId, context.branchId]
  );

  return mapUserRow(rows[0]);
}

async function deleteUser(context, userId) {
  const { rows } = await query(
    `SELECT id, role
     FROM users
     WHERE id = $1 AND tenant_id = $2 AND branch_id = $3
     LIMIT 1`,
    [userId, context.tenantId, context.branchId]
  );
  const user = rows[0];
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }
  if (user.role === "Admin") {
    const error = new Error("Cannot delete Admin accounts");
    error.status = 400;
    throw error;
  }

  await query("DELETE FROM users WHERE id = $1 AND tenant_id = $2 AND branch_id = $3", [
    userId,
    context.tenantId,
    context.branchId,
  ]);
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};
