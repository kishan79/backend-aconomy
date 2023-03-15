const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validateReqSchema");
const { protect, authorize } = require("../middlewares/auth");

const buysellController = require("../controllers/buySellController");

router.route("/listnft").post(buysellController.listNft);

module.exports = router;
