const NftModel = require("../models/NFT");
const UserModel = require("../models/User");
const asyncHandler = require("../middlewares/async");
const {
  nftSelectQuery,
  collectionSelectQuery,
} = require("../utils/selectQuery");
const { populate } = require("../models/User");

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
      })
        .populate({
          path: "nftCollection",
          select: collectionSelectQuery,
        })
        .select(nftSelectQuery);
    } else {
      res.status(400).json({ success: false });
    }
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.createNft = asyncHandler(async (req, res, next) => {
  try {
    const { id, wallet_address } = req.user;
    NftModel.create(
      {
        ...req.body,
        nftOwner: id,
        nftOwnerAddress: wallet_address,
        nftCreator: id,
        nftCreatorAddress: wallet_address,
        history: [
          {
            action: "Created",
            user: id,
          },
        ],
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

exports.transferNft = asyncHandler(async (req, res, next) => {
  try {
    const { receiver_address } = req.body;
    const { assetId } = req.params;
    const { wallet_address } = req.user;
    let userData = await UserModel.findOne({
      wallet_address: receiver_address,
    });
    if (userData) {
      let data = await NftModel.findOneAndUpdate(
        { _id: assetId, nftOwnerAddress: wallet_address },
        {
          nftOwnerAddress: receiver_address,
          nftOwner: userData._id,
        }
      );
      if (data) {
        res
          .status(201)
          .json({ success: true, message: "Asset transferred successfully" });
      } else {
        res
          .status(401)
          .json({ success: false, message: "Asset failed to transfer" });
      }
    } else {
      res
        .status(401)
        .json({ success: false, message: "Receiver address is not a user" });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.deleteNft = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { wallet_address } = req.user;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress === wallet_address) {
      if (
        nftData.validationState !== "validated" &&
        nftData.validationState !== "revalidated"
      ) {
        if (!nftData.nftOccupied) {
          let data = await NftModel.findOneAndUpdate(
            { _id: assetId },
            {
              nftOwnerAddress: null,
              nftOwner: null,
            }
          );
          if (data) {
            res
              .status(201)
              .json({ success: true, message: "Asset successfully deleted" });
          } else {
            res
              .status(401)
              .json({ success: false, message: "Failed to delete the asset" });
          }
        } else {
          res.status(401).json({ success: false, message: "Forbidden Action" });
        }
      } else {
        res.status(401).json({
          success: false,
          message: "This action is forbidden on validated asset",
        });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only asset owner can perform this action",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});
