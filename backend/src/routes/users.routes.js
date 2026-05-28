const express = require("express");
const usersService = require("../services/users.service");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const users = await usersService.listUsers(req.context);
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, requireRole("Admin"), async (req, res, next) => {
  try {
    const user = await usersService.createUser(req.context, req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", requireAuth, requireRole("Admin"), async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    const user = await usersService.updateUser(req.context, userId, req.body);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAuth, requireRole("Admin"), async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    await usersService.deleteUser(req.context, userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
