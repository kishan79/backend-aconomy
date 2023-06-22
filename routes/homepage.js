const express = require("express");
const router = express.Router();

const homepageController = require("../controllers/homepageController");

router.route("/latestnfts").get(homepageController.getLatestNfts);
router.route("/topvalidators").get(homepageController.getTopValidators);
router.route("/latestpools").get(homepageController.getLatestPools);

module.exports = router;
