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
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
