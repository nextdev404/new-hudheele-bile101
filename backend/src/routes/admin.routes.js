const express = require("express");
const PDFDocument = require("pdfkit");
const adminService = require("../services/admin.service");
const syncService = require("../services/sync.service");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("Admin", "Manager"));

router.get("/metrics", async (req, res, next) => {
  try {
    const metrics = await adminService.getMetrics(req.context);
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

function resolveReportDate(inputDate) {
  if (inputDate) return inputDate;
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

router.get("/history", async (req, res, next) => {
  try {
    const date = resolveReportDate(req.query.date);
    const rows = await adminService.getHistoryByDate(req.context, date);
    res.json({ date, rows });
  } catch (error) {
    next(error);
  }
});

router.get("/history.csv", async (req, res, next) => {
  try {
    const date = resolveReportDate(req.query.date);
    const rows = await adminService.getHistoryByDate(req.context, date);

    const header = ["order_id", "table_code", "waiter_name", "paid_at", "total"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      const line = [
        r.order_id,
        `"${String(r.table_code).replace(/"/g, '""')}"`,
        `"${String(r.waiter_name).replace(/"/g, '""')}"`,
        r.paid_at ? new Date(r.paid_at).toISOString() : "",
        Number(r.total || 0).toFixed(2),
      ];
      lines.push(line.join(","));
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="history-${date}.csv"`);
    res.send(lines.join("\n"));
  } catch (error) {
    next(error);
  }
});

router.get("/history.pdf", async (req, res, next) => {
  try {
    const date = resolveReportDate(req.query.date);
    const rows = await adminService.getHistoryByDate(req.context, date);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="history-${date}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);
    doc.fontSize(16).text(`Hudheele Daily History - ${date}`, { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Total orders: ${rows.length}`);
    doc.moveDown();

    rows.forEach((r, idx) => {
      doc
        .fontSize(10)
        .text(
          `${idx + 1}. #${r.order_id} | ${r.table_code} | ${r.waiter_name} | $${Number(
            r.total || 0
          ).toFixed(2)} | ${r.paid_at ? new Date(r.paid_at).toLocaleString() : "-"}`,
          { width: 520 }
        );
      doc.moveDown(0.2);
    });

    doc.end();
  } catch (error) {
    next(error);
  }
});

router.get("/sync/status", async (req, res, next) => {
  try {
    res.json(syncService.getSyncStatus());
  } catch (error) {
    next(error);
  }
});

router.post("/sync/run", async (req, res, next) => {
  try {
    const result = await syncService.runSyncJob({
      contextFilter: {
        tenantId: req.context.tenantId,
        branchId: req.context.branchId,
      },
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
