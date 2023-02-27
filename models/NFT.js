const mongoose = require("mongoose");

const NftSchema = new mongoose.Schema({}, { timestamps: true });

module.exports = mongoose.model("Nft", NftSchema);
