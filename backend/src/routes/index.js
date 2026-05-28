const express = require("express");
const authRoutes = require("./auth.routes");
const publicRoutes = require("./public.routes");
const tablesRoutes = require("./tables.routes");
const ordersRoutes = require("./orders.routes");
const inventoryRoutes = require("./inventory.routes");
const adminRoutes = require("./admin.routes");
const usersRoutes = require("./users.routes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ ok: true, service: "hudheele-backend" });
});

router.use("/auth", authRoutes);
router.use("/public", publicRoutes);
router.use("/tables", tablesRoutes);
router.use("/orders", ordersRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/admin", adminRoutes);
router.use("/users", usersRoutes);

module.exports = router;
