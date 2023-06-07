const mongoose = require("mongoose");

const ValidatorSchema = new mongoose.Schema(
  {
    wallet_address: {
      type: String,
    },
    profileImage: String,
    bannerImage: String,
    name: String,
    username: String,
    bio: String,
    assetType: [String],
    email: String,
    role: {
      type: String,
      default: "validator",
    },
    whitelisted: {
      type: Boolean,
      default: false,
    },
    signatureMessage: {
      type: String,
    },
    address: {
      country: String,
      area: String,
    },
    document: [
      {
        name: String,
        link: String,
      },
    ],
    socialLinks: {
      website: String,
      twitter: String,
      discord: String,
      other: String,
    },
    favouriteNFT: [{ type: mongoose.Schema.ObjectId, ref: "Nft" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Validator", ValidatorSchema);
