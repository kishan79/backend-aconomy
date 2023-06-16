const cron = require("node-cron");
const dotenv = require("dotenv");
const connectDB = require("../config/db");
const AuctionModel = require("../models/Auction");
const NotificationModel = require("../models/Notification");
const { addDays, isBefore } = require("date-fns");

dotenv.config({ path: "./.env" });
connectDB();

// cron.schedule(
//   "0 0 12 * * *",
const auctionCron = async () => {
  try {
    let auctionData = await AuctionModel.find();
    if (auctionData.length) {
      console.log(auctionData.length);
      for (let i = 0; i < auctionData.length; i++) {
        if (auctionData[i].status === "active") {
          if (
            isBefore(
              addDays(auctionData[i].createdAt, auctionData[i].duration),
              new Date()
            )
          ) {
            let auction = await AuctionModel.findOneAndUpdate(
              { _id: auctionData[i]._id },
              { status: "inactive" }
            );
            if (auction) {
              for (let j = 0; j < auctionData[i].bids.length; j++) {
                if (auctionData[i].bids[j].status === "none") {
                  let notification2 = await NotificationModel.create({
                    nft: auctionData[i].asset,
                    category: "bid-rejected",
                    user: auctionData[i].bids[j].bidder,
                    amount: auctionData[i].bids[j].amount,
                  });
                }
              }
              console.log(
                `Notification sent for saleId ${auctionData[i].saleId}`
              );
            }
          }
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
};
setTimeout(() => {
  auctionCron();
}, 5000);
//   {
//     timezone: "Asia/Kolkata",
//   }
// );
