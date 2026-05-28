const express = require("express");
const tablesService = require("../services/tables.service");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const tables = await tablesService.listTables(req.context);
    res.json(tables);
  } catch (error) {
    next(error);
  }
});

router.post("/bulk", requireRole("Admin", "Manager"), async (req, res, next) => {
  try {
    const tables = await tablesService.addTables(req.context, req.body.count);
    res.status(201).json(tables);
  } catch (error) {
    next(error);
  }
});

router.post("/:tableCode/open", requireRole("Admin", "Manager", "Waiter"), async (req, res, next) => {
  try {
    const table = await tablesService.openTable(req.params.tableCode, req.user, req.context);
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }
    res.json(table);
  } catch (error) {
    next(error);
  }
});

router.post("/:tableCode/release", requireRole("Admin", "Manager", "Waiter"), async (req, res, next) => {
  try {
    const table = await tablesService.releaseTable(req.params.tableCode, req.context);
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }
    res.json(table);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
