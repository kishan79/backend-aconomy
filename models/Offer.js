const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema(
  {
    pool: {
      type: mongoose.Schema.ObjectId,
      ref: "Pool",
    },
    pool_id: {
      type: Number,
    },
    bid_id: {
      type: Number,
    },
    loan_id: {
      type: Number,
    },
    lender: {
      type: mongoose.Schema.ObjectId,
      refPath: "lenderType",
    },
    lenderType: { type: String, enum: ["User", "Validator"] },
    lenderAddress: {
      type: String,
    },
    borrower: {
      type: mongoose.Schema.ObjectId,
      refPath: "borrowerType",
    },
    borrowerType: { type: String, enum: ["User", "Validator"] },
    borrowerAddress: {
      type: String,
    },
    amount: {
      type: Number,
    },
    type: { type: String, enum: ["lenderOffer", "loanRequest"] },
    status: {
      type: String,
      enum: ["none", "accepted", "rejected"],
      default: "none",
    },
    apy_percent: {
      type: Number,
      default: 1,
    },
    duration: {
      type: Number,
      default: 30,
    },
    expiration: {
      type: Number,
      default: 60,
    },
    erc20Address: {
      type: String,
    },
    expireOn: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", OfferSchema);
