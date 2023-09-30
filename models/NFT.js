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
    erc20Address: String,
    status: {
      type: String,
      enum: ["none", "accepted", "rejected", "expired", "withdrawn"],
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
      refPath: "nftOwnerType",
    },
    nftOwnerType: {
      type: String,
      enum: ["User", "Validator"],
    },
    tokenId: Number,
    name: String,
    summary: String,
    blockchain: String,
    chainId: Number,
    mediaLinks: [
      {
        mediaType: { type: String, enum: ["image", "video", "audio"] },
        mediaLink: String,
      },
    ],
    assetType: [String],
    nftCollection: {
      type: mongoose.Schema.ObjectId,
      ref: "Collection",
    },
    lazyMint: {
      type: Boolean,
      default: false,
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
    document: [
      {
        name: String,
        link: String,
      },
    ],
    assetOriginationDate: Date,
    valueOfAsset: {
      value: Number,
      unit: String,
    },
    description: String,
    fundBalance: {
      type: Number,
      default: 0,
    },
    erc20ContractAddress: String,
    validationId: {
      type: mongoose.Schema.ObjectId,
      ref: "NftValidation",
    },
    validationType: String,
    validationAmount: Number,
    validationDuration: Number,
    validationRoyality: Number,
    validationDocuments: [
      {
        name: String,
        link: String,
      },
    ],
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
    validationCommission: Number,
    validationDate: Date,
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
    previousOwner: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    previousOwnerAddress: String,
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
      enum: [
        "none",
        "sale",
        "auction",
        "lendborrow",
        "swap",
        "withdraw",
        "burned",
      ],
      default: "none",
    },
    lendBorrowOffers: [OfferSchema],
    lendBorrowOffer: {
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
      createdAt: Date,
    },
    borrowState: {
      type: String,
      enum: ["none", "active"],
      default: "none",
    },
    swapState: {
      type: String,
      enum: ["none", "requested"],
      default: "none",
    },
    history: [HistorySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Nft", NftSchema);
