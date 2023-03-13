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
    requestState: {
      type: String,
      enum: [
        "pending",
        "validated",
        "cancelled",
        "revalidation",
        "revalidated",
      ],
      default: "pending",
    },
    validator: {
      type: mongoose.Schema.ObjectId,
      ref: "Validator",
    },
    validatorAddress: "String",
    // validation: {
    //   Type: String,
    //   Amount: Number,
    //   Duration: Number,
    //   Royality: Number,
    //   Documents: [String],
    // },
    validationType: String,
    validationAmount: Number,
    validationDuration: Number,
    validationRoyality: Number,
    validationDocuments: [String],
    requestExpiresOn: Date,
    validationExpired: {
      type: Boolean,
      default: false
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NftValidation", NftValidationSchema);
