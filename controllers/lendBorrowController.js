const asyncHandler = require("../middlewares/async");
const NftModel = require("../models/NFT");
const UserActivityModel = require("../models/UserActivity");
const { addDays, isBefore } = require("date-fns");
const { nftSelectQuery } = require("../utils/selectQuery");

exports.proposeOffer = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress === wallet_address) {
      if (!nftData.nftOccupied) {
        
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

exports.removefromBorrow = asyncHandler(async (req, res, next) => {});

exports.makeOffer = asyncHandler(async (req, res, next) => {});

exports.fetchOffers = asyncHandler(async (req, res, next) => {});

exports.acceptOffer = asyncHandler(async (req, res, next) => {});

exports.rejectOffer = asyncHandler(async (req, res, next) => {});

exports.paybackLoan = asyncHandler(async (req, res, next) => {});
