const cron = require("node-cron");
const dotenv = require("dotenv");
const express = require("express");
const connectDB = require("../config/db");
const NftModel = require("../models/NFT");
const NFTValidationModel = require("../models/NFTValidation");
const { isBefore } = require("date-fns");

dotenv.config({ path: "./.env" });
connectDB();

app = express();

cron.schedule("* 1 * * * *", async function () {
  //   const fun = async () => {
  try {
    let nftData = await NftModel.find();
    if (nftData.length) {
      console.log(nftData.length);
      for (let i = 0; i < nftData.length; i++) {
        if (nftData[i].tokenId === 38) {
          const data = await NFTValidationModel.findOne({
            assetOwnerAddress: nftData[i].nftOwnerAddress,
            asset: nftData[i]._id,
          });
          if (data) {
            console.log(new Date(data.requestExpiresOn));
            console.log(isBefore(new Date(data.requestExpiresOn), new Date()));
            if (data.requestExpiresOn) {
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
                    console.log(
                      `Data Updated for tokenid ${nftData[i].tokenId}`
                    );
                  }
                }
              }
            }
          }
        }
      }
    } else {
      console.log("Failed to fetch data");
    }
  } catch (err) {
    console.log(err);
  }
  //   };
});
// fun();
app.listen(3000);
