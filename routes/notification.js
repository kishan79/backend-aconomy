const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middlewares/auth");

const notificationController = require("../controllers/notificationController");

router
  .route("/")
  .get(
    protect,
    authorize("user", "validator"),
    notificationController.fetchNotifications
  );
router
  .route("/read/:notificationId")
  .post(
    protect,
    authorize("user", "validator"),
    notificationController.readNotification
  );
router
  .route("/readall")
  .post(
    protect,
    authorize("user", "validator"),
    notificationController.readAllNotifications
  );
module.exports = router;
