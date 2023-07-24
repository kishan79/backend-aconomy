const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    nft: {
      type: mongoose.Schema.ObjectId,
      ref: "Nft",
    },
    swapnft: {
      type: mongoose.Schema.ObjectId,
      ref: "Nft",
    },
    pool: {
      type: mongoose.Schema.ObjectId,
      ref: "Pool",
    },
    category: String,
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    user2: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    validator: {
      type: mongoose.Schema.ObjectId,
      ref: "Validator",
    },
    amount: Number,
    read: {
      type: Boolean,
      default: false,
    },
    bidId: Number,
    auctionId: {
      type: mongoose.Schema.ObjectId,
      ref: "Auction",
    },
    saleId: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
