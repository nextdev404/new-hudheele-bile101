const { query } = require("../config/db");

function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}

async function getMetrics(context) {
  const revenueRes = await query(
    "SELECT COALESCE(SUM(amount),0) AS revenue FROM payments WHERE tenant_id = $1 AND branch_id = $2 AND DATE(created_at) = CURRENT_DATE",
    [context.tenantId, context.branchId]
  );
  const ordersRes = await query(
    "SELECT COUNT(*)::int AS total_orders FROM orders WHERE tenant_id = $1 AND branch_id = $2 AND DATE(created_at) = CURRENT_DATE",
    [context.tenantId, context.branchId]
  );
  const activeStaffRes = await query(
    "SELECT COUNT(*)::int AS active_staff FROM users WHERE tenant_id = $1 AND branch_id = $2 AND status = 'Active' AND role <> 'Customer'",
    [context.tenantId, context.branchId]
  );
  const sevenDaysRes = await query(
    `SELECT DATE(created_at) AS day, COALESCE(SUM(amount),0) AS total
     FROM payments
     WHERE tenant_id = $1 AND branch_id = $2 AND created_at >= NOW() - INTERVAL '7 days'
     GROUP BY DATE(created_at)
     ORDER BY day ASC`,
    [context.tenantId, context.branchId]
  );
  const topWaitersRes = await query(
    `SELECT COALESCE(waiter_name, 'Unknown') AS name, COUNT(*)::int AS count
     FROM orders
     WHERE tenant_id = $1 AND branch_id = $2 AND DATE(created_at) = CURRENT_DATE
     GROUP BY waiter_name
     ORDER BY count DESC
     LIMIT 3`,
    [context.tenantId, context.branchId]
  );

  const revenue = Number(revenueRes.rows[0].revenue || 0);
  const totalOrders = Number(ordersRes.rows[0].total_orders || 0);
  const avgOrder = totalOrders > 0 ? revenue / totalOrders : 0;
  const dailyMap = new Map(
    sevenDaysRes.rows.map((r) => [toDateKey(new Date(r.day)), Number(r.total)])
  );
  const series = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = toDateKey(d);
    series.push({
      date: key,
      label: d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
      total: dailyMap.get(key) || 0,
    });
  }

  return {
    revenue,
    totalOrders,
    avgOrder,
    activeStaff: Number(activeStaffRes.rows[0].active_staff || 0),
    series,
    topWaiters: topWaitersRes.rows.map((r) => ({ name: r.name, count: Number(r.count) })),
  };
}

async function getHistoryByDate(context, date) {
  const { rows } = await query(
    `SELECT
      o.id AS order_id,
      t.table_code,
      COALESCE(o.waiter_name, 'Unknown') AS waiter_name,
      o.paid_at,
      COALESCE(SUM(p.amount),0) AS total,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT('name', oi.product_name, 'qty', oi.qty, 'price', oi.price)
        ) FILTER (WHERE oi.id IS NOT NULL), '[]'
      ) AS items
    FROM orders o
    JOIN tables t ON t.id = o.table_id
    LEFT JOIN payments p ON p.order_id = o.id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.tenant_id = $1
      AND o.branch_id = $2
      AND o.status IN ('Paid', 'Released')
      AND DATE(o.paid_at) = $3::date
    GROUP BY o.id, t.table_code
    ORDER BY o.paid_at ASC`,
    [context.tenantId, context.branchId, date]
  );
  return rows;
}

module.exports = { getMetrics, getHistoryByDate };
