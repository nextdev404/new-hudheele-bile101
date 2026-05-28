const { query } = require("../config/db");

async function getCategories(context) {
  const { rows } = await query(
    "SELECT id, slug, name, icon FROM categories WHERE tenant_id = $1 ORDER BY sort_order ASC, name ASC",
    [context.tenantId]
  );
  return rows;
}

async function getProducts(context, availableOnly = false) {
  const filter = availableOnly ? "AND p.availability_status = 'in_stock'" : "";
  const { rows } = await query(
    `SELECT p.id, p.name, p.price, c.slug AS category, p.image, p.availability_status, p.available_quantity
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.tenant_id = $1 AND p.branch_id = $2
     ${filter}
     ORDER BY p.id ASC`,
    [context.tenantId, context.branchId]
  );
  return rows;
}

module.exports = {
  getCategories,
  getProducts,
};
