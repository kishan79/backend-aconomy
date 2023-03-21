const express = require("express");
const router = express.Router();
// const validate = require("../middlewares/validateReqSchema");
const { protect, authorize } = require("../middlewares/auth");
// const {
// } = require("../utils/validateReq");

const lendborrowController = require("../controllers/lendBorrowController");

router
  .route("/proposeOffer")
  .post(protect, authorize("user"), lendborrowController.proposeOffer);

router
  .route("/removeOffer")
  .post(protect, authorize("user"), lendborrowController.removefromBorrow);

router
  .route("/makeOffer")
  .post(protect, authorize("user"), lendborrowController.makeOffer);

module.exports = router;
