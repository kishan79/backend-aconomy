const express = require("express");
const router = express.Router();
const advancedResults = require("../middlewares/advancedResults");
const UserModel = require("../models/User");
const validate = require("../middlewares/validateReqSchema");
const {
  userValidSignature,
  userOnBoardReqSchema,
  sendValidationReqSchema,
} = require("../utils/validateReq");
const { protect, authorize, validateOwner } = require("../middlewares/auth");
const {
  userSelectQuery,
  collectionSelectQuery,
} = require("../utils/selectQuery");

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

router.route("/account/:id").get(
  // protect, authorize("user", "validator"),
  userController.fetchUserById
);

router
  .route("/profile/:wallet_address")
  .get(
    // protect,
    // authorize("user"),
    // validateOwner,
    userController.fetchUserByAddress
  )
  .put(protect, authorize("user"), validateOwner, userController.updateUser);

router.route("/:userId/assetNFTs").get(userController.fetchUserAssetNFTs);

router
  .route("/sendValidationRequest")
  .post(
    protect,
    authorize("user"),
    validate(sendValidationReqSchema),
    userController.sendValidationRequest
  );

router
  .route("/cancelValidationRequest/:assetId")
  .delete(protect, authorize("user"), userController.cancelValidationRequest);

router
  .route("/sendExtendValidationRequest")
  .post(
    protect,
    authorize("user"),
    validate(sendValidationReqSchema),
    userController.sendExtendValidationRequest
  );

router
  .route("/activities")
  .get(protect, authorize("user"), userController.fetchActivites);

router
  .route("/collections")
  .get(protect, authorize("user"), userController.fetchCollections);

router
  .route("/checkUsername")
  .post(
    protect,
    authorize("user", "validator"),
    userController.checkUsernameAvailability
  );
router
  .route("/sendRedeemRequest/:assetId")
  .post(protect, authorize("user"), userController.sendRedeemRequest);
router
  .route("/cancelRedeemRequest/:assetId")
  .post(protect, authorize("user"), userController.cancelRedeemRequest);
router
  .route("/redeemAsset/:assetId")
  .post(protect, authorize("user"), userController.redeemAsset);
router
  .route("/withdrawFund/:assetId")
  .post(protect, authorize("user"), userController.withdrawFunds);
router
  .route("/repayFund/:assetId")
  .post(protect, authorize("user"), userController.repayFunds);
module.exports = router;
