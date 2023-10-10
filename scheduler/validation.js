const cron = require("node-cron");
const dotenv = require("dotenv");
const connectDB = require("../config/db");
const NftModel = require("../models/NFT");
const NFTValidationModel = require("../models/NFTValidation");
const NotificationModel = require("../models/Notification");
const { isBefore, subDays, format } = require("date-fns");

dotenv.config({ path: "./.env" });
connectDB();

// cron.schedule(
//   "0 0 11 * * *",
//   async function () {
const validationCron = async () => {
  try {
    let nftData = await NftModel.find({ validationState: "validated" });
    if (nftData.length) {
      console.log(nftData.length);
      for (let i = 0; i < nftData.length; i++) {
        if (!nftData[i].validationExpired) {
          const data = await NFTValidationModel.findOne({
            // assetOwnerAddress: nftData[i].nftOwnerAddress,
            asset: nftData[i]._id,
          });
          if (data) {
            // console.log(new Date(data.requestExpiresOn));
            // console.log(isBefore(new Date(data.requestExpiresOn), new Date()));
            if (data.requestExpiresOn && data.requestState === "validated") {
              if (isBefore(new Date(data.requestExpiresOn), new Date())) {
                let validationData = await NFTValidationModel.findOneAndUpdate(
                  { _id: data._id },
                  { validationExpired: true, requestState: "unvalidated" }
                );
                if (validationData) {
                  let dataNft = await NftModel.findOneAndUpdate(
                    { _id: nftData[i]._id },
                    {
                      validationExpired: true,
                      validationState: "unvalidated",
                    }
                  );
                  if (dataNft) {
                    let notification = await NotificationModel.create({
                      nft: nftData[i]._id,
                      category: "asset-validation-expiry",
                      user: nftData[i].nftOwner,
                    });
                    if (notification) {
                      console.log(
                        `Data Updated for tokenid ${nftData[i].tokenId}`
                      );
                    }
                  }
                }
              }

              if (
                format(
                  subDays(new Date(data.requestExpiresOn), 7),
                  "ddMMyyyy"
                ) === format(new Date(), "ddMMyyyy")
              ) {
                let notification = await NotificationModel.create({
                  nft: nftData[i]._id,
                  category: "asset-validation-expiry-soon",
                  user: nftData[i].nftOwner,
                });
                if (notification) {
                  console.log(
                    `Notification sent for token id ${nftData[i].tokenId}`
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
  validationCron();
}, 5000);
//   },
//   { timezone: "Asia/Kolkata" }
// );
