const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validateReqSchema");
const { protect, authorize } = require("../middlewares/auth");
const advancedResults = require("../middlewares/advancedResults");
const NftModel = require("../models/NFT");
const {
  nftSelectQuery,
  userSelectQuery,
  collectionSelectQuery,
  userHistorySelectQuery,
  validatorHistorySelectQuery,
} = require("../utils/selectQuery");
const { nftCreateReqSchema } = require("../utils/validateReq");

const nftController = require("../controllers/nftController");

router
  .route("/")
  .get(
    advancedResults(NftModel, nftSelectQuery, [
      { path: "nftCollection", select: collectionSelectQuery },
      {
        path: "nftOwner",
        select: userSelectQuery,
      },
      {
        path: "history.user",
        select: userHistorySelectQuery,
      },
      {
        path: "history.validator",
        select: validatorHistorySelectQuery,
      },
    ]),
    nftController.fetchNfts
  )
  .post(
    protect,
    authorize("user"),
    validate(nftCreateReqSchema),
    nftController.createNft
  );
router.route("/:nftId").get(nftController.fetchNft);
router
  .route("/transfer/:assetId")
  .post(protect, authorize("user"), nftController.transferNft);
router.route("/delete/:assetId").post(protect, authorize("user"), nftController.deleteNft);
module.exports = router;
