const cron = require("node-cron");
const dotenv = require("dotenv");
const connectDB = require("../config/db");
const NftModel = require("../models/NFT");
const AuctionModel = require("../models/Auction");
const NotificationModel = require("../models/Notification");

dotenv.config({ path: "./.env" });
connectDB();

cron.schedule(
  "* * * * * *",
  async function () {
    try {
        
    } catch (err) {
      console.log(err);
    }
  },
  {
    timezone: "Asia/Kolkata",
  }
);
