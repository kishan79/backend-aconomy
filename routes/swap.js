const express = require("express");
const router = express.Router();
// const validate = require("../middlewares/validateReqSchema");
const { protect, authorize } = require("../middlewares/auth");
// const {
// } = require("../utils/validateReq");

const swapController = require("../controllers/swapController");

// router.route()
module.exports = router;
