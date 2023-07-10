const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validateReqSchema");
const { protect, authorize } = require("../middlewares/auth");

const { nftCreateReqSchema } = require("../utils/validateReq");
const kycController = require("../controllers/kycController");

router
  .route("/createApplicant")
  .post(protect, authorize("user", "validator"), kycController.createApplicant);
router
  .route("/createAccessToken")
  .post(
    protect,
    authorize("user", "validator"),
    kycController.createAccessToken
  );
router
  .route("/getApplicantStatus/:applicantId")
  .get(
    protect,
    authorize("user", "validator"),
    kycController.getApplicantStatus
  );
module.exports = router;
