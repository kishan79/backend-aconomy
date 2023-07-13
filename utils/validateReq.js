const { body } = require("express-validator");

const userValidSignature = [
  body("signature", "The signature field is required").notEmpty(),
];

const validatorValidSignature = [
  body("signature", "The signature field is required").notEmpty(),
];

const validatorOnBoardReqSchema = [
  // body("email", "Enter valid email").isEmail().normalizeEmail(),
  // body("email", "The email field is required").notEmpty(),
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
  // body("symbol", "The symbol field is required").notEmpty(),
  body(
    "collectionAddress",
    "The collectionAddress field is required"
  ).notEmpty(),
];

const nftCreateReqSchema = [
  body("tokenId", "The tokenId field is required").notEmpty(),
  body("name", "The name field is required").notEmpty(),
  // body("blockchain", "The blockchain field is required").notEmpty(),
  body("assetType", "The assetType field is required").notEmpty(),
  body("nftCollection", "The nftCollection field is required").notEmpty(),
  body("mediaLinks", "The mediaLinks field is required").notEmpty(),
];

const sendValidationReqSchema = [
  // body("assetName", "The assetName field is required").notEmpty(),
  body("asset", "The asset field is required").notEmpty(),
  body("validator", "The validator field is required").notEmpty(),
  body("validatorAddress", "The validatorAddress field is required").notEmpty(),
];

const buySellValidationReqSchema = [
  body("price", "The price field is required").notEmpty(),
  body("duration", "The Duration field is required").notEmpty(),
  body("saleId", "The saleId field is required").notEmpty(),
  body("contractAddress", "The contractAddress field is required").notEmpty(),
];

const editFixedPriceSellValidationReqSchema = [
  body("price", "The price field is required").notEmpty(),
  // body("duration", "The Duration field is required").notEmpty(),
];

const listAuctionValidationReqSchema = [
  body("price", "The price field is required").notEmpty(),
  body("duration", "The duration field is required").notEmpty(),
  body("saleId", "The saleId field is required").notEmpty(),
  body("contractAddress", "The contractAddress field is required").notEmpty(),
];

const placeBidValidationReqSchema = [
  body("amount", "The amount field is required").notEmpty(),
  body("duration", "The duration field is required").notEmpty(),
  body("bidId", "The bidId field is required").notEmpty(),
];

const editAuctionValidationReqSchema = [
  body("price", "The price field is required").notEmpty(),
  body("duration", "The duration field is required").notEmpty(),
];

const acceptBidValidationReqSchema = [
  body("bidId", "The bidId field is required").notEmpty(),
];

const withdrawBidValidationReqSchema = [
  body("auctionId", "The auctionId field is required").notEmpty(),
  body("bidId", "The bidId field is required").notEmpty(),
];

const proposeOfferValidationReqSchema = [
  body("price", "The price field is required").notEmpty(),
  body("apy", "The apy field is required").notEmpty(),
  body("duration", "The duration field is required").notEmpty(),
  body("expiration", "The expiration field is required").notEmpty(),
  body("nftId", "The nftId field is required").notEmpty(),
  body("contractAddress", "The contractAddress field is required").notEmpty(),
];

const makeOfferValidationReqSchema = [
  body("price", "The price field is required").notEmpty(),
  body("apy", "The apy field is required").notEmpty(),
  body("duration", "The duration field is required").notEmpty(),
  body("expiration", "The expiration field is required").notEmpty(),
  body("bidId", "The bidId field is required").notEmpty(),
];

const offerValidationReqSchema = [
  body("bidId", "The bidId field is required").notEmpty(),
];

module.exports = {
  userValidSignature,
  validatorValidSignature,
  validatorOnBoardReqSchema,
  userOnBoardReqSchema,
  collectionCreateReqSchema,
  nftCreateReqSchema,
  sendValidationReqSchema,
  buySellValidationReqSchema,
  listAuctionValidationReqSchema,
  placeBidValidationReqSchema,
  editFixedPriceSellValidationReqSchema,
  editAuctionValidationReqSchema,
  acceptBidValidationReqSchema,
  withdrawBidValidationReqSchema,
  proposeOfferValidationReqSchema,
  makeOfferValidationReqSchema,
  offerValidationReqSchema,
};
