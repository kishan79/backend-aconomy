const express = require("express");
const router = express.Router();
const advancedResults = require("../middlewares/advancedResults");
const UserModel = require("../models/User");
const validate = require("../middlewares/validateReqSchema");
const {
  userValidSignature,
  userOnBoardReqSchema,
} = require("../utils/validateReq");
const { protect, authorize } = require("../middlewares/auth");
const { userSelectQuery } = require("../utils/selectQuery");

//import controllers
const userController = require("../controllers/userController");

router.route("/auth/:wallet_address/nonce").get(userController.generateNonce);
router
  .route("/auth/:wallet_address/signature")
  .post(validate(userValidSignature), userController.validateSignature);
router
  .route("/onboard")
  .post(
    protect,
    authorize("user"),
    validate(userOnBoardReqSchema),
    userController.onboardUser
  );
router
  .route("/profile")
  .get(
    protect,
    authorize("user"),
    advancedResults(UserModel, userSelectQuery),
    userController.fetchUsers
  );

router
  .route("/profile/:wallet_address")
  .get(protect, authorize("user"), userController.fetchUserByAddress)
  .put(protect, authorize("user"), userController.updateUser);

module.exports = router;
