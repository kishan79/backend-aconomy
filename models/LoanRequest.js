const mongoose = require("mongoose");

const LoanRequestSchema = new mongoose.Schema(
  {
    pool: {
      type: mongoose.Schema.ObjectId,
      ref: "Pool",
    },
    pool_id: {
      type: Number,
    },
    loan_id: {
      type: Number,
    },
    borrower: {
      type: mongoose.Schema.ObjectId,
      refPath: "borrowerType",
    },
    borrowerType: { type: String, enum: ["User", "Validator"], required: true },
    borrowerAddress: {
      type: String,
    },
    lender: {
      type: mongoose.Schema.ObjectId,
      refPath: "lenderType",
    },
    lenderType: { type: String, enum: ["User", "Validator"], required: true },
    lenderAddress: { type: String },
    amount: {
      type: Number,
    },
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
    expireOn: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LoanRequest", LoanRequestSchema);
