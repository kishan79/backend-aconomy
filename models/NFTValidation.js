const mongoose = require("mongoose");

const NftValidationSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.ObjectId,
      ref: "Nft",
    },
    assetName: String,
    assetOwnerAddress: String,
    assetOwner: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    requeststate: {
      type: String,
      enum: ["unvalidated", "pending", "validated", "cancelled"],
      default: "unvalidated",
    },
    validator: {
      type: mongoose.Schema.ObjectId,
      ref: "Validator",
    },
    validatorAddress: "String",
    validation: {
        Type: String,
        Amount: Number,
        Duration: Number,
        Royality: Number,
        Document: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("NftValidation", NftValidationSchema);
