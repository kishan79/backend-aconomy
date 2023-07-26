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
    applicantId: String,
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
      linkedin: String,
    },
    favouriteNFT: [{ type: mongoose.Schema.ObjectId, ref: "Nft" }],
    applicantType: String,
    reviewResult: {},
    levelName: String,
    sandboxMode: Boolean,
    kycEventType: String,
    reviewStatus: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Validator", ValidatorSchema);
