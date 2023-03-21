const express = require("express");
const router = express.Router();
// const validate = require("../middlewares/validateReqSchema");
const { protect, authorize } = require("../middlewares/auth");
// const {
// } = require("../utils/validateReq");

const lendborrowController = require("../controllers/lendBorrowController");

router
  .route("/proposeOffer/:assetId")
  .post(protect, authorize("user"), lendborrowController.proposeOffer);

router
  .route("/removeOffer/:assetId")
  .post(protect, authorize("user"), lendborrowController.removefromBorrow);

router
  .route("/makeOffer/:assetId")
  .post(protect, authorize("user"), lendborrowController.makeOffer);

router
  .route("/acceptOffer/:assetId")
  .post(protect, authorize("user"), lendborrowController.acceptOffer);

router
  .route("/rejectOffer/:assetId")
  .post(protect, authorize("user"), lendborrowController.rejectOffer);

router
  .route("/paybackLoan/:assetId")
  .post(protect, authorize("user"), lendborrowController.paybackLoan);

module.exports = router;
