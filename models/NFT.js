const mongoose = require("mongoose");

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
    nftCreatorAddress: String
    // validation: {
    //     Type: String,
    //     Amount: Number,
    //     Duration: Number,
    //     Royality: Number,
    //     Document: String
    // }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Nft", NftSchema);
