const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validateReqSchema");
const { protect, authorize } = require("../middlewares/auth");

const buysellController = require("../controllers/buySellController");

router.route("/listnft/:assetId").post(buysellController.fixPriceListNft);
router.route("/buynft/:assetId").post(buysellController.buyNft);

module.exports = router;
