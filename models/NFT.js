const mongoose = require("mongoose");

const HistorySchema = new mongoose.Schema(
  {
    action: String,
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    validator: {
      type: mongoose.Schema.ObjectId,
      ref: "Validator",
    },
    amount: Number,
  },
  { timestamps: true }
);

const OfferSchema = new mongoose.Schema(
  {
    price: Number,
    apy: Number,
    duration: Number,
    expiration: Number,
    bidId: Number,
    expireOn: Date,
    bidder: { type: mongoose.Schema.ObjectId, ref: "User" },
    bidderAddress: String,
    status: {
      type: String,
      enum: ["none", "accepted", "rejected"],
      default: "none",
    },
  },
  { timestamps: true }
);

const SwapSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.ObjectId, ref: "Nft" },
    assetOwner: { type: mongoose.Schema.ObjectId, ref: "User" },
    assetOwnerAddress: String,
    nftContractAddress: String,
    nftContractAddress2: String,
    tokenId: Number,
    tokenId2: Number,
    swapId: Number,
    status: {
      type: String,
      enum: ["none", "accepted", "rejected"],
      default: "none",
    },
  },
  { timestamps: true }
);

const NftSchema = new mongoose.Schema(
  {
    nftOwnerAddress: String,
    nftOwner: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    tokenId: Number,
    name: String,
    summary: String,
    blockchain: String,
    mediaLinks: [String],
    assetType: [String],
    nftCollection: {
      type: mongoose.Schema.ObjectId,
      ref: "Collection",
    },
    properties: [
      {
        key: String,
        value: String,
      },
    ],
    royalities: [
      {
        address: String,
        percent: Number,
      },
    ],
    externalLink: String,
    unlockableContent: String,
    assetJurisdiction: {
      country: String,
      area: String,
    },
    document: String,
    assetOriginationDate: Date,
    valueOfAsset: Number,
    description: String,
    fundBalance: {
      type: Number,
      default: 0,
    },
    erc20ContractAddress: String,
    validationType: String,
    validationAmount: Number,
    validationDuration: Number,
    validationRoyality: Number,
    validationDocuments: [String],
    validationCount: Number,
    validationState: {
      type: String,
      enum: [
        "unvalidated",
        "pending",
        "validated",
        "cancelled",
        // "revalidation",
        // "revalidated",
      ],
      default: "unvalidated",
    },
    validationExpired: {
      type: Boolean,
      default: false,
    },
    validator: {
      type: mongoose.Schema.ObjectId,
      ref: "Validator",
    },
    validatorAddress: String,
    nftCreator: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    nftCreatorAddress: String,
    listingPrice: Number,
    listingDate: Date,
    listingDuration: Number,
    saleId: Number,
    redeemRequest: {
      type: String,
      enum: ["false", "true", "accepted", "redeemed", "rejected"],
      default: "false",
    },
    nftContractAddress: String,
    state: {
      type: String,
      enum: ["none", "sale", "auction", "lendborrow", "swap"],
      default: "none",
    },
    offers: [OfferSchema],
    offer: {
      nftId: Number,
      nftContractAddress: String,
      price: Number,
      apy: Number,
      duration: Number,
      expiration: Number,
      bidId: Number,
      bidderAddress: String,
      bidder: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    },
    swapOffers: [SwapSchema],
    history: [HistorySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Nft", NftSchema);
