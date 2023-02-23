const express = require("express");
const router = express.Router();
const advancedResults = require('../middlewares/advancedResults');
const UserModel = require('../models/User');
const validate = require('../middlewares/validateReqSchema');
const { userValidSignature, userOnBoardReqSchema } = require('../utils/validateReq');
const { protect, authorize } = require("../middlewares/auth");

//import controllers
const userController = require("../controllers/userController");

router.route('/auth/:wallet_address/nonce').get(userController.generateNonce);
router.route('/auth/:wallet_address/signature').post(validate(userValidSignature), userController.validateSignature)
router.route('/onboard').post(protect, authorize("user"), validate(userOnBoardReqSchema), userController.onboardUser);
router.route('/update').post(protect, authorize("user"), userController.updateUser);

module.exports = router;
