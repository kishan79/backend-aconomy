const express = require("express");
const router = express.Router();

const homepageController = require("../controllers/homepageController");

router.route("/carousel").get(homepageController.getCarouselData);
router.route("/latestnfts").get(homepageController.getLatestNfts);
router.route("/topvalidators").get(homepageController.getTopValidators);
router.route("/latestpools").get(homepageController.getLatestPools);
router.route("/featuredAssetClass").get(homepageController.getFeaturedAssetClass);

module.exports = router;
