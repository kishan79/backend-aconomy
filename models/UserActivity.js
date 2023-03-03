const mongoose = require("mongoose");

const UserActivity = new mongoose.Schema(
  {
    userAddress: String,
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    asset: {
      type: mongoose.Schema.ObjectId,
      ref: "Nft",
    },
    assetName: String,
    assetOwner: String,
    statusText: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserActivity", UserActivity);
