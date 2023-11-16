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
    lendborrowId: {
      type: mongoose.Schema.ObjectId,
      ref: "LendBorrow"
    },
    lendborrowNftId: Number,
    saleId: Number,
    tokenId: Number,
    swapId: Number,
    swapRequestId: {
      type: mongoose.Schema.ObjectId,
      ref: "Swap",
    },
    action: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
