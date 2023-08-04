const cron = require("node-cron");
const dotenv = require("dotenv");
const connectDB = require("../config/db");
const NftModel = require("../models/NFT");
const NotificationModel = require("../models/Notification");
const { isBefore, subDays, format } = require("date-fns");

dotenv.config({ path: "./.env" });
connectDB();

// cron.schedule(
//   "0 0 13 * * *",
const lendbrorrowCron = async () => {
  try {
    let nftData = await NftModel.find({ state: "lendborrow" });
    if (nftData.length) {
      console.log(nftData.length);
      for (let i = 0; i < nftData.length; i++) {
        if (nftData[i].lendBorrowOffers.length) {
          for (let j = 0; j < nftData[i].lendBorrowOffers.length; j++) {
            if (nftData[i].lendBorrowOffers[j].status === "none") {
              if (
                isBefore(
                  new Date(nftData[i].lendBorrowOffers[j].expireOn),
                  new Date()
                )
              ) {
                let data = await NftModel.findOneAndUpdate(
                  {
                    _id: nftData[i]._id,
                    "lendBorrowOffers.bidId":
                      nftData[i].lendBorrowOffers[j].bidId,
                  },
                  {
                    $set: {
                      "lendBorrowOffers.$.status": "expired",
                    },
                  }
                );
                if (data) {
                  let notification = await NotificationModel.create({
                    nft: nftData[i]._id,
                    category: "lend-offer-expire",
                    user: nftData[i].lendBorrowOffers[j].bidder,
                  });
                  if (notification) {
                    console.log(
                      `Lend/Borrow :- Data Updated for tokenid ${nftData[i].tokenId}`
                    );
                  }
                }
              }
            }
            if (nftData[i].lendBorrowOffers[j].status === "accepted") {
              if (
                format(
                  subDays(new Date(nftData[i].lendBorrowOffers[j].expireOn), 5),
                  "ddMMyyyy"
                ) === format(new Date(), "ddMMyyyy")
              ) {
                let notification = await NotificationModel.create({
                  nft: nftData[i]._id,
                  category: "lend-borrow-repay-soon",
                  user: nftData[i].nftOwner,
                });
                if (notification) {
                  console.log(
                    `Lend/Borrow :- Notification sent for token id ${nftData[i].tokenId}`
                  );
                }
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
  lendbrorrowCron();
}, 5000);
//   { timezone: "Asia/Kolkata" }
// );
