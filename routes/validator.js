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
  .route("/validateAsset/:requestId")
  .post(
    protect,
    authorize("validator"),
    validatorController.validateAsset
  );

module.exports = router;
