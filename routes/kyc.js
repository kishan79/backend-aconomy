const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validateReqSchema");
const { protect, authorize } = require("../middlewares/auth");

const { nftCreateReqSchema } = require("../utils/validateReq");
const kycController = require("../controllers/kycController");

router.route("/createApplicant").post(kycController.createApplicant);
router.route("/createAccessToken").post(kycController.createAccessToken);
router.route("/getApplicantStatus").post(kycController.getApplicantStatus);
module.exports = router;
