const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validateReqSchema");
const { newsletterReqSchema } = require("../utils/validateReq");

const homepageController = require("../controllers/homepageController");

router.route("/carousel").get(homepageController.getCarouselData);
router.route("/latestnfts").get(homepageController.getLatestNfts);
router.route("/topvalidators").get(homepageController.getTopValidators);
router.route("/latestpools").get(homepageController.getLatestPools);
router
  .route("/featuredAssetClass")
  .get(homepageController.getFeaturedAssetClass);
router
  .route("/newsletter")
  .post(validate(newsletterReqSchema), homepageController.newsLetter);
router.route("/journals").get(homepageController.getJournals);
router.route("/topassetowners").get(homepageController.getTopAssetOwners);

module.exports = router;
