const asyncHandler = require("../middlewares/async");
const NftModel = require("../models/NFT");
const UserActivityModel = require("../models/UserActivity");
const { addDays, isBefore } = require("date-fns");
const { nftSelectQuery } = require("../utils/selectQuery");

exports.proposeOffer = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    const { price, apy, duration, expiration } = req.body;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress === wallet_address) {
      if (nftData.state === "none") {
        let data = await NftModel.findOneAndUpdate(
          { _id: assetId },
          {
            offer: { price, apy, duration, expiration },
          }
        );
        if (data) {
          res
            .status(201)
            .json({ success: true, message: "Offer proposed successfully" });
        } else {
          res
            .status(401)
            .json({ success: false, message: "Failed to propose an offer" });
        }
      } else {
        res.status(401).json({ success: false, message: "Action forbidden" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only asset owner can propose an offer",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.removefromBorrow = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { wallet_address } = req.user;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress === wallet_address) {
      if (nftData.state === "lendborrow") {
        let data = await NftModel.findOneAndUpdate(
          { _id: assetId },
          {
            offer: null,
          }
        );
        if (data) {
          res.status(201).json({
            success: true,
            message: "Offer removed from borrow successfully",
          });
        } else {
          res
            .status(401)
            .json({ success: false, message: "Failed to remove from borrow" });
        }
      } else {
        res.status(401).json({ success: false, message: "Action forbidden" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only asset owner can remove from borrow",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.makeOffer = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { wallet_address } = req.user;
    const { price, apy, duration, expiration } = req.body;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress !== wallet_address) {
      if (nftData.state === "lendborrow") {
        let data = await NftModel.findOneAndUpdate(
          { _id: assetId },
          {
            $push: {
              offers: {
                price,
                apy,
                duration,
                expiration,
              },
            },
          }
        );
        if (data) {
          res
            .status(201)
            .json({ success: true, message: "Offer made successfully" });
        } else {
          res
            .status(401)
            .json({ success: false, message: "Failed to make an offer" });
        }
      } else {
        res.status(401).json({ success: false, message: "Action forbidden" });
      }
    } else {
      res
        .status(401)
        .json({ success: false, message: "Asset owner can't make an offer" });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.fetchOffers = asyncHandler(async (req, res, next) => {
  try {
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.acceptOffer = asyncHandler(async (req, res, next) => {
  try {
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.rejectOffer = asyncHandler(async (req, res, next) => {
  try {
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.paybackLoan = asyncHandler(async (req, res, next) => {
  try {
  } catch (err) {
    res.status(401).json({ success: false });
  }
});
