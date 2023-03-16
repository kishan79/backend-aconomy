const mongoose = require("mongoose");

const BidBuySellSchema = new mongoose.Schema(
  {
    auctionId: {
      type: mongoose.Schema.ObjectId,
      ref: "Auction",
    },
    amount: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["none", "accepted", "rejected"],
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
    baseAuctionPrice: Number,
    duration: Number,
    bids: [BidBuySellSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Auction", AuctionSchema);
