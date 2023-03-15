const mongoose = require("mongoose");

const BidBuySellSchema = new mongoose.Schema(
  {
    auction_id: {
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

module.exports = mongoose.model("BidBuySell", BidBuySellSchema);
