const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  wallet_address: {
    type: String,
  },
  name: String,
  username: String,
  email: {
    type: String,
    // required: [true, "Please add an email"],
    // unique: true,
    // match: [
    //   /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
    //   "Please add a valid email",
    // ],
  },
  role: {
    type: String,
    // default: "user",
  },
  signatureMessage: {
    type: String,
  },
  termOfService: {
    type: Boolean,
    // default: false
  }
}, {timestamps: true});

module.exports = mongoose.model("User", UserSchema);
