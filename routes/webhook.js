const express = require("express");
const router = express.Router();

const webhookController = require("../controllers/webhookController");

router.route("/kyc-webhook").post(webhookController.kycWebhook);

module.exports = router;
