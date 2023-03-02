const mongoose = require("mongoose");

const ValidatorActivity = new mongoose.Schema({
    validatorAddress: String,
    validator: {
        type: mongoose.Schema.ObjectId,
        ref: "Validator"
    },
    asset: {
        type: mongoose.Schema.ObjectId,
        ref: "Nft",
    },
    assetOwner: String,
    assetName: String,
    statusText: String,
}, {timestamps: true});

module.exports = mongoose.model("ValidatorActivity", ValidatorActivity);