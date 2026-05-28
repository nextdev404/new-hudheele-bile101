const express = require("express");
const publicService = require("../services/public.service");

const router = express.Router();

router.get("/categories", async (req, res, next) => {
  try {
    const data = await publicService.getCategories(req.context);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    const availableOnly = req.query.available === "true";
    const data = await publicService.getProducts(req.context, availableOnly);
    return res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
