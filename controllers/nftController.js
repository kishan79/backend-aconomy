const NftModel = require("../models/NFT");
const asyncHandler = require("../middlewares/async");
const { nftSelectQuery } = require("../utils/selectQuery");

exports.fetchNfts = asyncHandler(async (req, res, next) => {
  try {
    res.status(200).json(res.advancedResults);
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.fetchNft = asyncHandler(async (req, res, next) => {
  try {
    const { nftId } = req.params;
    if (!!nftId) {
      NftModel.findOne({ _id: nftId }, (err, doc) => {
        if (err) {
          res.status(400).json({ success: false, data: {} });
        } else {
          res.status(200).json({ success: true, data: doc });
        }
      }).select(nftSelectQuery);
    } else {
      res.status(400).json({ success: false });
    }
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.createNft = asyncHandler(async (req, res, next) => {
  try {
    console.log("12",req.user, req.body);
    NftModel.create(
      {
        ...req.body,
        nftOwner: req.user.id,
        nftOwnerAddress: req.user.wallet_address,
      },
      (err, doc) => {
        if (err) {
          res.status(401).json({ success: false });
        } else {
          if (!!doc) {
            res.status(201).json({
              success: true,
              message: "NFT successfully created",
            });
          } else {
            res
              .status(400)
              .json({ success: false, message: "Failed to create NFT" });
          }
        }
      }
    );
  } catch (err) {
    res.status(401).json({ success: false, message: "Failed to create NFT" });
  }
});
