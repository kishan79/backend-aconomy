const mongoose = require("mongoose");

const BidBuySellSchema = new mongoose.Schema(
  {
    auctionId: {
      type: mongoose.Schema.ObjectId,
      ref: "Auction",
    },
    bidder: {
      type: mongoose.Schema.ObjectId,
      ref: "User"
    },
    bidderAddress: String,
    bidId: Number,
    // saleId: Number,
    amount: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["none", "accepted", "withdrawn", "rejected"],
      default: "none",
    },
    duration: {
      type: Number,
      required: true,
    },
    expireOn: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

const AuctionSchema = new mongoose.Schema(
  {
    auctionOwner: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    auctionOwnerAddress: {
      type: String,
    },
    asset: {
      type: mongoose.Schema.ObjectId,
      ref: "Nft",
    },
    saleId: Number,
    baseAuctionPrice: Number,
    duration: Number,
    bids: [BidBuySellSchema],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Auction", AuctionSchema);
