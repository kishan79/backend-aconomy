const mongoose = require("mongoose");

const AuctionSchema = new mongoose.Schema(
  {
    auctionOwner: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    auctionOwnerAddress: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Auction", AuctionSchema);
