const mongoose = require("mongoose");

const NftSchema = new mongoose.Schema(
  {
    nftOwnerAddress: String,
    nftOwner: {
      type: mongoose.Schema.ObjectId,
      ref: "User"
    },
    tokenId: Number,
    name: String,
    summary: String,
    blockchain: String,
    mediaLinks: [String],
    assetType: [String],
    nftCollection: {
      type: mongoose.Schema.ObjectId,
      ref: "Collection"
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
      }
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
    description: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Nft", NftSchema);
