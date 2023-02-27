const mongoose = require("mongoose");

const CollectionSchema = new mongoose.Schema(
  {
    collectionOwnerId: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    collectionOwnerAddress: {
      type: String,
    },
    profileImage: String,
    bannerImage: String,
    name: String,
    description: String,
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
      other: String,
    },
    blockchain: String,
    paymentToken: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Collection", CollectionSchema);
