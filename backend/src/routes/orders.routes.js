const express = require("express");
const ordersService = require("../services/orders.service");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.post("/", requireRole("Admin", "Manager", "Waiter"), async (req, res, next) => {
  try {
    const { tableCode, items } = req.body;
    if (!tableCode || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "tableCode and items are required" });
    }
    const order = await ordersService.createOrder({ tableCode, items, user: req.user, context: req.context });
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

router.post("/:orderId/send", requireRole("Admin", "Manager", "Waiter"), async (req, res, next) => {
  try {
    const result = await ordersService.updateOrderStatus(Number(req.params.orderId), "Sent to Kitchen", req.context);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/:orderId/status", requireRole("Admin", "Manager", "Waiter", "Chef", "Cashier"), async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await ordersService.updateOrderStatus(Number(req.params.orderId), status, req.context);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/:orderId/payments", requireRole("Admin", "Manager", "Cashier", "Waiter"), async (req, res, next) => {
  try {
    const { method, amount } = req.body;
    if (!method || typeof amount !== "number") {
      return res.status(400).json({ message: "method and numeric amount are required" });
    }
    const payment = await ordersService.addPayment(Number(req.params.orderId), {
      method,
      amount,
      user: req.user.name,
    }, req.context);
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
});

router.get("/history", requireRole("Admin", "Manager", "Cashier", "Waiter"), async (req, res, next) => {
  try {
    const rows = await ordersService.getOrderHistory(req.context);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
