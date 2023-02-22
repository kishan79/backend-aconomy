const mongoose = require("mongoose");

const ValidatorSchema = new mongoose.Schema({
  wallet_address: {
    type: String,
  },
  name: String,
  email: {
    type: String,
    // required: [true, "Please add an email"],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please add a valid email",
    ],
  },
  role: {
    type: String,
    default: "validator",
  },
  signatureMessage: {
    type: String,
  }
}, {timestamps: true});

module.exports = mongoose.model("Validator", ValidatorSchema);
