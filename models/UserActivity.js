const mongoose = require("mongoose");

const UserActivity = new mongoose.Schema({
    userAddress: String,
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: "User"
    },
    asset: {
        type: mongoose.Schema.ObjectId,
        ref: "Nft",
    },
    statusText: "String"
},{timestamps: true});

module.exports = mongoose.model("UserActivity", UserActivity);