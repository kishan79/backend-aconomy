const express = require("express");
const router = express.Router();
const advancedResults = require("../middlewares/advancedResults");
const ValidatorModel = require("../models/Validator");
const validate = require("../middlewares/validateReqSchema");
const {
  validatorValidSignature,
  validatorOnBoardReqSchema,
} = require("../utils/validateReq");
const { protect, authorize, validateOwner } = require("../middlewares/auth");
const { validatorSelectQuery } = require("../utils/selectQuery");

//import controllers
const validatorController = require("../controllers/validatorController");

router
  .route("/auth/:wallet_address/nonce")
  .get(validatorController.generateNonce);
router
  .route("/auth/:wallet_address/signature")
  .post(
    validate(validatorValidSignature),
    validatorController.validateSignature
  );
router
  .route("/onboard")
  .post(
    protect,
    authorize("validator"),
    validate(validatorOnBoardReqSchema),
    validatorController.onboardValidator
  );
router
  .route("/profile")
  .get(
    protect,
    authorize("user", "validator"),
    advancedResults(ValidatorModel, validatorSelectQuery),
    validatorController.fetchValidators
  );

router
  .route("/account/:id")
  .get(
    protect,
    authorize("user", "validator"),
    validatorController.fetchValidatorById
  );

router
  .route("/profile/:wallet_address")
  .get(
    protect,
    authorize("validator"),
    validateOwner,
    validatorController.fetchValidatorByAddress
  )
  .put(
    protect,
    authorize("validator"),
    validateOwner,
    validatorController.updateValidator
  );

router
  .route("/validationRequests")
  .get(
    protect,
    authorize("validator"),
    validatorController.fetchAllValidationRequest
  );

router
  .route("/rejectValidationRequest/:requestId")
  .delete(
    protect,
    authorize("validator"),
    validatorController.rejectValidationRequest
  );

router
  .route("/validateAsset/:requestId")
  .post(protect, authorize("validator"), validatorController.validateAsset);

router
  .route("/revalidateAsset/:requestId")
  .post(protect, authorize("validator"), validatorController.reValidateAsset);

router
  .route("/addfunds/:assetId")
  .post(protect, authorize("validator"), validatorController.addMoreFunds);

router
  .route("/activities")
  .get(protect, authorize("validator"), validatorController.fetchActivites);

router
  .route("/validatedAssets")
  .get(
    protect,
    authorize("validator"),
    validatorController.fetchValidatedAssets
  );
module.exports = router;
