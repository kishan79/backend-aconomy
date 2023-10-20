const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validateReqSchema");
const { protect, authorize } = require("../middlewares/auth");
const {
  proposeOfferValidationReqSchema,
  makeOfferValidationReqSchema,
  offerValidationReqSchema,
} = require("../utils/validateReq");

const lendborrowController = require("../controllers/lendBorrowController");

router
  .route("/proposeOffer/:assetId")
  .post(
    protect,
    authorize("user"),
    validate(proposeOfferValidationReqSchema),
    lendborrowController.proposeOffer
  );

router
  .route("/removeOffer/:assetId")
  .post(protect, authorize("user"), lendborrowController.removefromBorrow);

router
  .route("/makeOffer/:assetId")
  .post(
    protect,
    authorize("user"),
    validate(makeOfferValidationReqSchema),
    lendborrowController.makeOffer
  );

router
  .route("/withdrawOffer/:assetId")
  .post(
    protect,
    authorize("user"),
    validate(offerValidationReqSchema),
    lendborrowController.withdrawOffer
  );

router
  .route("/acceptOffer/:assetId")
  .post(
    protect,
    authorize("user"),
    validate(offerValidationReqSchema),
    lendborrowController.acceptOffer
  );

router
  .route("/rejectOffer/:assetId")
  .post(
    protect,
    authorize("user"),
    validate(offerValidationReqSchema),
    lendborrowController.rejectOffer
  );

router
  .route("/paybackLoan/:assetId")
  .post(protect, authorize("user"), lendborrowController.paybackLoan);

router
  .route("/lendborrowbyAsset/:assetId")
  .get(lendborrowController.fetchLastestlendborrowByAsset);
module.exports = router;

router.route("/").get(lendborrowController.fetchBorrowNfts);

module.exports = router;
