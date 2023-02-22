const express = require("express");
const router = express.Router();

const userController = require("../controllers/authController");

router.route('/:wallet_address/nonce').get(userController.generateNonce);
router.route('/:wallet_address/signature').post(userController.validateSignature)
module.exports = router;
