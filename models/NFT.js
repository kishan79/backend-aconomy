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
    bidder: { type: mongoose.Schema.ObjectId, ref: "user" },
    bidderAddress: String,
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
    validationType: String,
    validationAmount: Number,
    validationDuration: Number,
    validationRoyality: Number,
    validationDocuments: [String],
    validationState: {
      type: String,
      enum: [
        "unvalidated",
        "pending",
        "validated",
        "cancelled",
        "revalidation",
        "revalidated",
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
    // listedOnMarketplace: {
    //   type: Boolean,
    //   default: false,
    // },
    listingDate: Date,
    listingDuration: Number,
    // listedForAuction: {
    //   type: Boolean,
    //   default: false,
    // },
    // nftOccupied: {
    //   type: Boolean,
    //   default: false,
    // },
    saleId: Number,
    redeemRequest: {
      type: String,
      enum: ["false", "true", "accepted", "redeemed", "rejected"],
      default: "false",
    },
    nftContractAddress: String,
    listForLendBorrow: {
      type: Boolean,
      default: false,
    },
    state: {
      type: String,
      enum: ["none", "sale", "auction", "lendborrow"],
      default: "none",
    },
    offers: [OfferSchema],
    offer: {
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
      
      // expireOn: Date,
    },
    // validation: {
    //     Type: String,
    //     Amount: Number,
    //     Duration: Number,
    //     Royality: Number,
    //     Document: String
    // }
    history: [HistorySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Nft", NftSchema);
