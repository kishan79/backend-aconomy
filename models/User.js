const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    wallet_address: {
      type: String,
    },
    name: String,
    username: String,
    email: {
      type: String,
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
    applicantType: String,
    reviewResult: {},
    levelName: String,
    sandboxMode: Boolean,
    kycEventType: String,
    reviewStatus: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
