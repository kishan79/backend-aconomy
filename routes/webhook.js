const express = require("express");
const router = express.Router();

const webhookController = require("../controllers/webhookController");

router.route("/kyb").post(webhookController.kybWebhook);
router.route("/kyc").post(webhookController.kycWebhook);

module.exports = router;
