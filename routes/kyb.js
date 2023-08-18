const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth");

const kybController = require("../controllers/kybController");

router.route("/initateKYB").post(
  protect,
  authorize("validator"),
  kybController.initiateKYB
);
module.exports = router;
