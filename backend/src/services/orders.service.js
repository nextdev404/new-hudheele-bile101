const { query, pool } = require("../config/db");
const { emitEvent } = require("../lib/socket");

const ALLOWED_STATUS = new Set([
  "Occupied",
  "Sent to Kitchen",
  "Preparing",
  "Ready to Serve",
  "Served",
  "Paid",
  "Released",
]);

async function createOrder({ tableCode, items, user, context }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tableRes = await client.query(
      "SELECT id FROM tables WHERE table_code = $1 AND tenant_id = $2 AND branch_id = $3 LIMIT 1",
      [tableCode, context.tenantId, context.branchId]
    );
    if (!tableRes.rows[0]) {
      throw Object.assign(new Error("Table not found"), { status: 404 });
    }
    const tableId = tableRes.rows[0].id;

    const orderRes = await client.query(
      `INSERT INTO orders(table_id, waiter_id, waiter_name, status)
       VALUES($1, $2, $3, 'Occupied')
       RETURNING id, status, created_at`,
      [tableId, user.userId, user.name]
    );
    await client.query(
      "UPDATE orders SET tenant_id = $2, branch_id = $3 WHERE id = $1",
      [order.id, context.tenantId, context.branchId]
    );
    const order = orderRes.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items(order_id, product_id, product_name, qty, price)
         VALUES($1, $2, $3, $4, $5)`,
        [order.id, item.id, item.name, item.qty, item.price]
      );
      await client.query(
        "UPDATE order_items SET tenant_id = $2, branch_id = $3 WHERE order_id = $1",
        [order.id, context.tenantId, context.branchId]
      );
    }

    await client.query("COMMIT");
    emitEvent("order.status.changed", { orderId: order.id, status: order.status });
    return order;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateOrderStatus(orderId, status, context) {
  if (!ALLOWED_STATUS.has(status)) {
    throw Object.assign(new Error("Invalid status"), { status: 400 });
  }
  const { rows } = await query(
    "UPDATE orders SET status = $2, updated_at = NOW(), sync_version = sync_version + 1 WHERE id = $1 AND tenant_id = $3 AND branch_id = $4 RETURNING id, status, table_id",
    [orderId, status, context.tenantId, context.branchId]
  );
  if (!rows[0]) {
    throw Object.assign(new Error("Order not found"), { status: 404 });
  }

  if (status === "Paid" || status === "Released") {
    await query(
      `UPDATE tables
       SET status = 'Available', locked_by = NULL, waiter_name = NULL, display_name = 'Available', opened_at = NULL
       WHERE id = $1 AND tenant_id = $2 AND branch_id = $3`,
      [rows[0].table_id, context.tenantId, context.branchId]
    );
    emitEvent("tables.updated", { tableId: rows[0].table_id });
  }

  emitEvent("order.status.changed", { orderId, status });
  emitEvent("kitchen.updated", { orderId, status });
  return rows[0];
}

async function addPayment(orderId, payment, context) {
  const { rows: orderRows } = await query(
    "SELECT id, status FROM orders WHERE id = $1 AND tenant_id = $2 AND branch_id = $3 LIMIT 1",
    [orderId, context.tenantId, context.branchId]
  );
  if (!orderRows[0]) {
    throw Object.assign(new Error("Order not found"), { status: 404 });
  }

  const { rows } = await query(
    "INSERT INTO payments(order_id, method, amount, paid_by) VALUES($1, $2, $3, $4) RETURNING id, order_id, method, amount, created_at",
    [orderId, payment.method, payment.amount, payment.user || "system"]
  );
  await query(
    "UPDATE payments SET tenant_id = $2, branch_id = $3 WHERE id = $1",
    [rows[0].id, context.tenantId, context.branchId]
  );

  await query(
    "UPDATE orders SET status = 'Paid', updated_at = NOW(), paid_at = NOW(), sync_version = sync_version + 1 WHERE id = $1 AND tenant_id = $2 AND branch_id = $3",
    [orderId, context.tenantId, context.branchId]
  );

  emitEvent("order.status.changed", { orderId, status: "Paid" });
  return rows[0];
}

async function getOrderHistory(context) {
  const { rows } = await query(
    `SELECT o.id AS order_id, t.table_code, o.waiter_name, o.status, o.paid_at, COALESCE(SUM(p.amount),0) AS total
     FROM orders o
     JOIN tables t ON t.id = o.table_id
     LEFT JOIN payments p ON p.order_id = o.id
     WHERE o.status IN ('Paid', 'Released') AND o.tenant_id = $1 AND o.branch_id = $2
     GROUP BY o.id, t.table_code
     ORDER BY o.paid_at DESC NULLS LAST, o.id DESC`,
    [context.tenantId, context.branchId]
  );
  return rows;
}

module.exports = {
  createOrder,
  updateOrderStatus,
  addPayment,
  getOrderHistory,
};
