const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validateReqSchema");
const {protect, authorize} = require("../middlewares/auth");
const advancedResults = require("../middlewares/advancedResults");
const NftModel = require("../models/Nft");

const nftController = require("../controllers/nftController");

module.exports = router;