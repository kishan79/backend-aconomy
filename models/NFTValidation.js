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
        "unvalidated",
        "validated",
        "cancelled",
        // "revalidation",
        // "revalidated",
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
    erc20ContractAddress: String,
    fundBalance: Number,
    validationType: String,
    validationAmount: Number,
    validationDuration: Number,
    validationRoyality: Number,
    validationDocuments: [
      {
        name: String,
        link: String,
      },
    ],
    validationCount: Number,
    requestExpiresOn: Date,
    validationExpired: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NftValidation", NftValidationSchema);
