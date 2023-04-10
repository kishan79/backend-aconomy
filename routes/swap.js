const express = require("express");
const router = express.Router();
// const validate = require("../middlewares/validateReqSchema");
const { protect, authorize } = require("../middlewares/auth");
// const {
// } = require("../utils/validateReq");

const swapController = require("../controllers/swapController");

router
  .route("/listForSwap/:assetId")
  .post(protect, authorize("user"), swapController.listForSwap);
router
  .route("/requestForSwap/:assetId")
  .post(protect, authorize("user"), swapController.requestForSwap);
router
  .route("/acceptSwapRequest/:assetId")
  .post(protect, authorize("user"), swapController.acceptSwapRequest);
router
  .route("/rejectSwapRequest/:assetId")
  .post(protect, authorize("user"), swapController.rejectSwapRequest);
router
  .route("/cancelSwapRequest/:assetId")
  .post(protect, authorize("user"), swapController.cancelSwapRequest);
router.route("/swapRequest/:assetId").get(swapController.fetchSwapRequest);
router
  .route("/swapStatus/:assetId")
  .get(protect, authorize("user"), swapController.fetchSwapStatus);
router.route("/").get(swapController.fetchSwapNfts);

module.exports = router;
