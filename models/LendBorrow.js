const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    // lendBorrowId: {
    //   type: mongoose.Schema.ObjectId,
    //   ref: "LendBorrow",
    // },
    lender: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    lenderAddress: String,
    price: Number,
    apy: Number,
    duration: Number,
    expiration: Number,
    bidId: Number,
    expireOn: Date,
    erc20Address: String,
    status: {
      type: String,
      enum: ["none", "accepted", "rejected", "expired", "withdrawn", "repaid"],
      default: "none",
    },
  },
  { timestamps: true }
);

const LendBorrowSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.ObjectId,
      ref: "Nft",
    },
    nftId: Number,
    nftContractAddress: String,
    price: Number,
    apy: Number,
    duration: Number,
    expiration: Number,
    // bidId: Number,
    borrowerAddress: String,
    borrower: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    offers: [offerSchema],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    cancelled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LendBorrow", LendBorrowSchema);
