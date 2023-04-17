const mongoose = require("mongoose");

const PoolSchema = new mongoose.Schema(
  {
    pool_address: {
      type: String,
    },
    pool_owner: {
      type: mongoose.Schema.ObjectId,
      ref: "Validator",
    },
    pool_owner_address: {
      type: String,
    },
    name: {
      type: String,
    },
    profile_image: {
      type: String,
    },
    banner_image: {
      type: String,
    },
    metadata_url: {
      type: String,
    },
    description: {
      type: String,
    },
    visibility: {
      type: String,
      enum: ["private", "public"],
    },
    apr_percent: {
      type: Number,
    },
    loan_request_expire: {
      type: Date,
    },
    // loan_payment_cycle: {
    //   type: Number,
    // },
    type: {
      type: String,
    },
    process_fee: {
      type: Number,
    },
    is_verified: {
      type: Boolean,
    },
    lender_whitelisted: Boolean,
    borrower_whitelisted: Boolean,
    whitelist: {
      type: String,
      enum: ["lender", "borrower", "both", "none"],
    },
    lenders: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
    borrowers: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Pool", PoolSchema);
