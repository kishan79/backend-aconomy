const cron = require("node-cron");
const dotenv = require("dotenv");
const connectDB = require("../config/db");
const NftModel = require("../models/NFT");
const LendBorrowModel = require("../models/LendBorrow");
const NotificationModel = require("../models/Notification");
const { isBefore, subDays, format } = require("date-fns");

dotenv.config({ path: "./.env" });
connectDB();

// cron.schedule(
//   "0 0 13 * * *",
const lendborrowCron = async () => {
  try {
    let lendborrowData = await LendBorrowModel.find({ status: "active" });
    if (lendborrowData.length) {
      console.log(lendborrowData.length);
      for (let i = 0; i < lendborrowData.length; i++) {
        for (let j = 0; j < lendborrowData[i].offers.length; j++) {
          if (lendborrowData[i].offers[j].status === "none") {
            if (
              isBefore(
                new Date(lendborrowData[i].offers[j].expireOn),
                new Date()
              )
            ) {
              let data = await LendBorrowModel.findOneAndUpdate(
                {
                  _id: lendborrowData[i]._id,
                  "offers.bidId": lendborrowData[i].offers[j].bidId,
                },
                {
                  $set: {
                    "offers.$.status": "expired",
                  },
                }
              );
              if (data) {
                let notification = await NotificationModel.create({
                  nft: lendborrowData[i].asset,
                  category: "lend-offer-expire",
                  user: lendborrowData[i].offers[j].lender,
                });
                if (notification) {
                  console.log(
                    `Lend/Borrow :- Data Updated for tokenid ${lendborrowData[i].asset}`
                  );
                }
              }
            }
          }
          if (lendborrowData[i].offers[j].status === "accepted") {
            if (
              format(
                subDays(new Date(lendborrowData[i].offers[j].expireOn), 5),
                "ddMMyyyy"
              ) === format(new Date(), "ddMMyyyy")
            ) {
              let notification = await NotificationModel.create({
                nft: lendborrowData[i].asset,
                category: "lend-borrow-repay-soon",
                user: lendborrowData[i].borrower,
              });
              if (notification) {
                console.log(
                  `Lend/Borrow :- Notification sent for token id ${lendborrowData[i].asset}`
                );
              }
            }
          }
        }
      }
      process.exit(0);
    } else {
      console.log("Failed to fetch data");
    }
  } catch (err) {
    console.log(err);
  }
};
setTimeout(() => {
  lendborrowCron();
}, 5000);
//   { timezone: "Asia/Kolkata" }
// );
