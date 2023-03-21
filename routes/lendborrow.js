const express = require("express");
const router = express.Router();
// const validate = require("../middlewares/validateReqSchema");
const { protect, authorize } = require("../middlewares/auth");
// const {
// } = require("../utils/validateReq");

const lendborrowController = require("../controllers/lendBorrowController");

router.route("/proposeOffer").post(lendborrowController.proposeOffer);
