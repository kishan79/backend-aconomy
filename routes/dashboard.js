const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");

router.route("/search").get(dashboardController.globalSearch);

module.exports = router;
