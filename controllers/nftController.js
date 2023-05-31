const NftModel = require("../models/NFT");
const UserModel = require("../models/User");
const NFTValidationModel = require("../models/NFTValidation");
const UserActivityModel = require("../models/UserActivity");
const NotificationModel = require("../models/Notification");
const asyncHandler = require("../middlewares/async");
const {
  nftSelectQuery,
  collectionSelectQuery,
  userSelectQuery,
  validatorSelectQuery,
  userHistorySelectQuery,
  validatorHistorySelectQuery,
} = require("../utils/selectQuery");

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
        .populate([
          {
            path: "nftCollection",
            select: collectionSelectQuery,
          },
          { path: "nftOwner", select: userSelectQuery },
          { path: "nftCreator", select: userSelectQuery },
          { path: "validator", select: validatorSelectQuery },
          {
            path: "history.user",
            select: userHistorySelectQuery,
          },
          {
            path: "history.validator",
            select: validatorHistorySelectQuery,
          },
        ])
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
      async (err, doc) => {
        if (err) {
          res.status(401).json({ success: false });
        } else {
          if (!!doc) {
            let activity = await UserActivityModel.create({
              userAddress: wallet_address,
              user: id,
              asset: doc._id,
              assetName: doc.name,
              statusText: "NFT Created",
            });
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
    const { wallet_address, id } = req.user;
    let userData = await UserModel.findOne({
      wallet_address: receiver_address,
    });
    if (userData) {
      let data = await NftModel.findOneAndUpdate(
        { _id: assetId, nftOwnerAddress: wallet_address },
        {
          nftOwnerAddress: receiver_address,
          nftOwner: userData._id,
          $push: {
            history: {
              action: "Transfered asset",
              user: id,
            },
          },
        }
      );
      if (data) {
        let activity = await UserActivityModel.insertMany([
          {
            userAddress: wallet_address,
            user: id,
            asset: data._id,
            assetName: data.name,
            statusText: "NFT Transfered",
          },
          {
            userAddress: userData.wallet_address,
            user: userData._id,
            asset: data._id,
            assetName: data.name,
            statusText: "NFT Recieved",
          },
        ]);
        let notification = await NotificationModel.create({
          nft: data._id,
          category: "asset-transfer",
          user: userData._id,
          user2: id,
        });
        if (notification) {
          res
            .status(201)
            .json({ success: true, message: "Asset transferred successfully" });
        }
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
    const { wallet_address, id } = req.user;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress === wallet_address) {
      if (nftData.validationState !== "validated") {
        if (nftData.state === "none") {
          let data = await NftModel.findOneAndUpdate(
            { _id: assetId },
            {
              nftOwnerAddress: null,
              nftOwner: null,
              $push: {
                history: {
                  action: "Deleted asset",
                  user: id,
                },
              }
            }
          );
          if (data) {
            let activity = await UserActivityModel.create({
              userAddress: wallet_address,
              user: id,
              asset: data._id,
              assetName: data.name,
              statusText: "NFT Deleted",
            });
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

exports.burnNft = asyncHandler(async (req, res, next) => {
  try {
    const { receiver_address } = req.body;
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    let userData = await UserModel.findOne({
      wallet_address: receiver_address,
    });
    if (userData) {
      let nftData = await NftModel.findOne({ _id: assetId });
      if (nftData.nftOwnerAddress === wallet_address) {
        if (nftData.validationState === "validated") {
          if (nftData.state === "none") {
            let validationData = await NFTValidationModel.findOneAndDelete({
              asset: assetId,
            });
            if (validationData) {
              let data = await NftModel.findOneAndUpdate(
                { _id: assetId },
                {
                  previousOwner: nftData.nftOwner,
                  previousOwnerAddress: nftData.nftOwnerAddress,
                  nftOwnerAddress: validationData.validatorAddress,
                  nftOwner: validationData.validator,
                  validationType: null,
                  validationAmount: null,
                  validationDuration: null,
                  validationRoyality: null,
                  validationDocuments: null,
                  requestExpiresOn: null,
                  validationState: "unvalidated",
                  validationExpired: true,
                  state: "burned",
                  $push: {
                    history: {
                      action: "burned",
                      user: id,
                    },
                  },
                }
              );
              if (data) {
                let activity = await UserActivityModel.create({
                  userAddress: wallet_address,
                  user: id,
                  asset: nftData._id,
                  assetName: nftData.name,
                  statusText: "Burned",
                });
                let notification = await NotificationModel.create({
                  nft: nftData._id,
                  category: "asset-burned",
                  user: nftData.nftOwner,
                  validator: validationData.validator
                });
                if (notification) {
                  res.status(201).json({
                    success: true,
                    message: "Asset burned successfully",
                  });
                }
              } else {
                res
                  .status(401)
                  .json({ success: false, message: "Failed to burn asset" });
              }
            } else {
              res.status(401).json({
                success: false,
                message: "Failed to delete validation",
              });
            }
          } else {
            res
              .status(401)
              .json({ success: false, message: "Forbidden Action" });
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
    } else {
      res.status(401).json({
        success: false,
        message: "Receiver address is not a valid user",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});
