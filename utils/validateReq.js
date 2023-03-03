const { body } = require("express-validator");

const userValidSignature = [
  body("signature", "The signature field is required").notEmpty(),
];

const validatorValidSignature = [
  body("signature", "The signature field is required").notEmpty(),
];

const validatorOnBoardReqSchema = [
  body("email", "Enter valid email").isEmail().normalizeEmail(),
  body("email", "The email field is required").notEmpty(),
  body("username", "The username field is required").notEmpty(),
  body("name", "The name field is required").notEmpty(),
  body("address", "The address field is required").notEmpty(),
];

const userOnBoardReqSchema = [
  body("name", "The name field is required").notEmpty(),
  body("username", "The username field is required").notEmpty(),
  body("termOfService", "The term field must be true").toBoolean().isIn([true]),
];

const collectionCreateReqSchema = [
  body("name", "The name field is required").notEmpty(),
  body("assetType", "The assetType field is required").notEmpty(),
  body("symbol", "The symbol field is required").notEmpty(),
];

const nftCreateReqSchema = [
  body("tokenId", "The field tokenId is required").notEmpty(),
  body("name", "The field name is required").notEmpty(),
  body("blockchain", "The field blockchain is required").notEmpty(),
  body("assetType", "The field assetType is required").notEmpty(),
  body("nftCollection", "The field nftCollection is required").notEmpty(),
  body("mediaLinks", "The field mediaLinks is required").notEmpty(),
];

const sendValidationReqSchema = [
  body("assetName", "The assetName field is required").notEmpty(),
  body("asset", "The asset field is required").notEmpty(),
  body("validator", "The validator field is required").notEmpty(),
  body("validatorAddress", "The validatorAddress field is required").notEmpty(),
];

module.exports = {
  userValidSignature,
  validatorValidSignature,
  validatorOnBoardReqSchema,
  userOnBoardReqSchema,
  collectionCreateReqSchema,
  nftCreateReqSchema,
  sendValidationReqSchema,
};
