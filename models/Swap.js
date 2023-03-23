const mongoose = require("mongoose");

const SwapOfferSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.ObjectId, ref: "Nft" },
    assetOwner: { type: mongoose.Schema.ObjectId, ref: "User" },
    assetOwnerAddress: String,
    nftContractAddress: String,
    nftContractAddress2: String,
    tokenId: Number,
    tokenId2: Number,
    swapId: Number,
    status: {
      type: String,
      enum: ["none", "accepted", "rejected", "cancelled"],
      default: "none",
    },
  },
  { timestamps: true }
);

const SwapSchema = new mongoose.Schema(
  {
    swapOwner: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    swapOwnerAddress: String,
    asset: {
      type: mongoose.Schema.ObjectId,
      ref: "Nft",
    },
    offers: [SwapOfferSchema],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Swap", SwapSchema);
