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

module.exports = router;
