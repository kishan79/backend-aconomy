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
    signatureMessage: {
      type: String,
    },
    address: {
      country: String,
      area: String,
    },
    document: String,
    socialLinks: {
      website: String,
      twitter: String,
      discord: String,
      other: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Validator", ValidatorSchema);