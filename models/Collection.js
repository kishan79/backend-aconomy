const mongoose = require("mongoose");

const CollectionSchema = new mongoose.Schema(
  {
    collectionOwner: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    collectionOwnerAddress: {
      type: String,
    },
    collectionAddress: String,
    profileImage: String,
    bannerImage: String,
    name: String,
    symbol: String,
    description: String,
    blockchain: String,
    assetType: [String],
    royalities: [
      {
        address: String,
        percent: Number,
      },
    ],
    socialLinks: {
      website: String,
      twitter: String,
      discord: String,
      facebook: String,
      instagram: String,
      other: String,
    },
    paymentToken: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Collection", CollectionSchema);
