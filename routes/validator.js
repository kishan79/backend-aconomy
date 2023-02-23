const express = require("express");
const router = express.Router();
const advancedResults = require('../middlewares/advancedResults');
const ValidatorModel = require('../models/Validator');
const { protect, authorize } = require("../middlewares/auth");

//import controllers
const validatorController = require("../controllers/validatorController");

router.route('/auth/:wallet_address/nonce').get(validatorController.generateNonce);
router.route('/auth/:wallet_address/signature').post(validatorController.validateSignature)
// router.route('/onboard').post(protect, authorize("validator"), validatorController.onboardValidator);
router.route('/onboard').post(validatorController.onboardValidator);
router.route('/update').post(protect, authorize("validator"),validatorController.updateValidator);

module.exports = router;
