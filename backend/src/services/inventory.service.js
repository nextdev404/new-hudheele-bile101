const { query } = require("../config/db");
const { emitEvent } = require("../lib/socket");

async function setInventory(productId, quantity, userName, context) {
  const availability = quantity > 0 ? "in_stock" : "currently_unavailable";
  const { rows } = await query(
    `UPDATE products
     SET available_quantity = $2, availability_status = $3, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $4 AND branch_id = $5
     RETURNING id, name, available_quantity, availability_status`,
    [productId, quantity, availability, context.tenantId, context.branchId]
  );

  if (!rows[0]) {
    throw Object.assign(new Error("Product not found"), { status: 404 });
  }

  const eventRes = await query(
    `INSERT INTO inventory_events(product_id, event_type, previous_qty, new_qty, performed_by)
     VALUES($1, 'manual_set', NULL, $2, $3)
     RETURNING id`,
    [productId, quantity, userName]
  );
  await query(
    "UPDATE inventory_events SET tenant_id = $2, branch_id = $3 WHERE id = $1",
    [eventRes.rows[0].id, context.tenantId, context.branchId]
  );

  emitEvent("inventory.updated", rows[0]);
  return rows[0];
}

module.exports = { setInventory };
