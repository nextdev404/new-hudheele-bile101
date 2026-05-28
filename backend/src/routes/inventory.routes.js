const express = require("express");
const inventoryService = require("../services/inventory.service");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("Admin", "Manager", "Chef"));

router.post("/:productId/set", async (req, res, next) => {
  try {
    const qty = Number(req.body.quantity);
    if (Number.isNaN(qty) || qty < 0) {
      return res.status(400).json({ message: "quantity must be 0 or greater" });
    }
    const item = await inventoryService.setInventory(
      Number(req.params.productId),
      qty,
      req.user.name,
      req.context
    );
    res.json(item);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
