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

const dashboardController = require("../controllers/dashboardController");

router.route("/search").get(dashboardController.globalSearch);

module.exports = router;
