const mongoose = require("mongoose");

const PoolOfferSchema = new mongoose.Schema(
  {
    pool_id: {
      type: mongoose.Schema.ObjectId,
      ref: "Pool",
    },
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
      required: true,
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

const PoolSchema = new mongoose.Schema(
  {
    pool_address: {
      type: String,
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
    description: {
      type: String,
    },
    visibility: {
      type: Boolean,
    },
    apr_percent: {
      type: Number,
    },
    loan_request_expire: {
      type: Date,
    },
    loan_payment_cycle: {
      type: Number,
    },
    type: {
      type: String,
    },
    process_fee: {
      type: Number,
    },
    is_verified: {
      type: Boolean,
    },
    lenders: {},
    borrowers: {},
    offers: [PoolOfferSchema],
    //   accepted_offer:{},
    //   loan_request:{},
  },
  { timestamps: true }
);

module.exports = mongoose.model("Pool", PoolSchema);
