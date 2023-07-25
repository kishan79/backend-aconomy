const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth");

const dashboardController = require("../controllers/dashboardController");

router.route("/search").get(dashboardController.globalSearch);
router
  .route("/notification-status/:notificationId")
  .put(
    protect,
    authorize("user", "validator"),
    dashboardController.changeNotificationStatus
  );

module.exports = router;
