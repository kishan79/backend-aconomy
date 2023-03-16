const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validateReqSchema");
const { protect, authorize } = require("../middlewares/auth");
const { buySellValidationReqSchema } = require("../utils/validateReq");

const buysellController = require("../controllers/buySellController");

router
  .route("/listnft/:assetId")
  .post(
    protect,
    authorize("user"),
    validate(buySellValidationReqSchema),
    buysellController.fixPriceListNft
  );
router
  .route("/buynft/:assetId")
  .post(protect, authorize("user"), buysellController.buyNft);
router
  .route("/editSale/:assetId")
  .put(
    protect,
    authorize("user"),
    validate(buySellValidationReqSchema),
    buysellController.editFixedPriceSale
  );

router
  .route("/listforAuction")
  .post(protect, authorize("user"), buysellController.listNftForAuction);
router
  .route("/placeBid/:auctionId")
  .post(protect, authorize("user"), buysellController.placebid);
router
  .route("/editAuction/:auctionId")
  .put(protect, authorize("user"), buysellController.editAuction);
router.route("/auctionbyId/:auctionId").get(buysellController.fetchAuctionbyId);
module.exports = router;
