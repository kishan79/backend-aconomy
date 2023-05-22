const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    nft: {
      type: mongoose.Schema.ObjectId,
      ref: "Nft",
    },
    category: String,
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    userAddress: String,
    validator: {
      type: mongoose.Schema.ObjectId,
      ref: "Validator",
    },
    validatorAddress: String,
    message: [String],
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
