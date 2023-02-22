const express = require("express");
const router = express.Router();
const advancedResults = require('../middlewares/advancedResults');
const UserModel = require('../models/User');
const { protect, authorize } = require("../middlewares/auth");

//import controllers
const userController = require("../controllers/userController");

router.route('/auth/:wallet_address/nonce').get(userController.generateNonce);
router.route('/auth/:wallet_address/signature').post(userController.validateSignature)
router.route('/update').post(protect, authorize("user"), userController.updateUser);

module.exports = router;
