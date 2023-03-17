const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validateReqSchema");
const { protect, authorize } = require("../middlewares/auth");
const {
  buySellValidationReqSchema,
  editFixedPriceSellValidationReqSchema,
} = require("../utils/validateReq");

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
    validate(editFixedPriceSellValidationReqSchema),
    buysellController.editFixedPriceSale
  );

router
  .route("/listforAuction/:assetId")
  .post(protect, authorize("user"), buysellController.listNftForAuction);
router
  .route("/placeBid/:assetId")
  .post(protect, authorize("user"), buysellController.placeBid);
router
  .route("/editAuction/:assetId")
  .put(protect, authorize("user"), buysellController.editAuction);
router.route("/auctionbyId/:auctionId").get(buysellController.fetchAuctionbyId);
router
  .route("/auctionbyAsset/:assetId")
  .get(buysellController.fetchAuctionByAsset);
module.exports = router;
