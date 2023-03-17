const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validateReqSchema");
const { protect, authorize } = require("../middlewares/auth");
const {
  buySellValidationReqSchema,
  editFixedPriceSellValidationReqSchema,
  listAuctionValidationReqSchema,
  placeBidValidationReqSchema,
  editAuctionValidationReqSchema,
  acceptBidValidationReqSchema,
  withdrawBidValidationReqSchema,
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
  .post(
    protect,
    authorize("user"),
    validate(listAuctionValidationReqSchema),
    buysellController.listNftForAuction
  );
router
  .route("/placeBid/:assetId")
  .post(
    protect,
    authorize("user"),
    validate(placeBidValidationReqSchema),
    buysellController.placeBid
  );
router
  .route("/editAuction/:assetId")
  .put(
    protect,
    authorize("user"),
    validate(editAuctionValidationReqSchema),
    buysellController.editAuction
  );
router
  .route("/acceptBid/:assetId")
  .post(
    protect,
    authorize("user"),
    validate(acceptBidValidationReqSchema),
    buysellController.acceptBid
  );
router
  .route("/withdrawBid")
  .post(
    protect,
    authorize("user"),
    validate(withdrawBidValidationReqSchema),
    buysellController.withdrawBid
  );
router.route("/auctionbyId/:auctionId").get(buysellController.fetchAuctionbyId);
router
  .route("/allauctionsbyAsset/:assetId")
  .get(buysellController.fetchAllAuctionsByAsset);
router
  .route("/auctionbyAsset/:assetId")
  .get(buysellController.fetchLastestAuctionByAsset);
module.exports = router;
