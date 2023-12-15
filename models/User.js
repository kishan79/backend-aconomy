const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    wallet_address: {
      type: String,
    },
    name: String,
    username: { type: String, unique: true },
    email: {
      type: { type: String, unique: true },
    },
    bio: String,
    role: {
      type: String,
      // default: "user",
    },
    applicantId: String,
    signatureMessage: {
      type: String,
    },
    socialLinks: {
      website: String,
      twitter: String,
      discord: String,
      telegram: String,
      instagram: String,
      other: String,
    },
    termOfService: {
      type: Boolean,
      // default: false
    },
    profileImage: String,
    bannerImage: String,
    favouriteNFT: [{ type: mongoose.Schema.ObjectId, ref: "Nft" }],
    // applicantType: String,
    // reviewResult: {},
    // levelName: String,
    // sandboxMode: Boolean,
    verification_url: String,
    kycEventType: String,
    reviewStatus: String,
    tvl: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
