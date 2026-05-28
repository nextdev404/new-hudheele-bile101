const express = require("express");
const { query } = require("../config/db");
const authService = require("../services/auth.service");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/login", async (req, res, next) => {
  try {
    const { name, pin } = req.body;
    if (!name || !pin) {
      return res.status(400).json({ message: "name and pin are required" });
    }
    const result = await authService.login({ name, pin, context: req.context });
    if (!result) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken is required" });
    }
    const result = await authService.refresh(refreshToken);
    if (!result) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT id, name, role, status FROM users WHERE id = $1 AND tenant_id = $2 AND branch_id = $3 LIMIT 1",
      [req.user.userId, req.context.tenantId, req.context.branchId]
    );
    if (!rows[0]) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
