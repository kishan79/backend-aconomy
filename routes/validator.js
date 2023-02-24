const express = require("express");
const router = express.Router();
const advancedResults = require('../middlewares/advancedResults');
const ValidatorModel = require('../models/Validator');
const validate = require('../middlewares/validateReqSchema');
const { validatorValidSignature, validatorOnBoardReqSchema } = require('../utils/validateReq');
const { protect, authorize } = require("../middlewares/auth");

//import controllers
const validatorController = require("../controllers/validatorController");

router.route('/auth/:wallet_address/nonce').get(validatorController.generateNonce);
router.route('/auth/:wallet_address/signature').post(validate(validatorValidSignature), validatorController.validateSignature)
router.route('/onboard').post(protect, authorize("validator"), validate(validatorOnBoardReqSchema), validatorController.onboardValidator);
router.route('/profile/update').put(protect, authorize("validator"), validatorController.updateValidator);

module.exports = router;
