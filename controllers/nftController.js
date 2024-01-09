const NftModel = require("../models/NFT");
const UserModel = require("../models/User");
const ValidatorModel = require("../models/Validator");
const NFTValidationModel = require("../models/NFTValidation");
const UserActivityModel = require("../models/UserActivity");
const NotificationModel = require("../models/Notification");
const AuctionModel = require("../models/Auction");
const asyncHandler = require("../middlewares/async");
const {
  nftSelectQuery,
  collectionSelectQuery,
  userSelectQuery,
  validatorSelectQuery,
  userHistorySelectQuery,
  validatorHistorySelectQuery,
} = require("../utils/selectQuery");
const { Role, getRemoteIp } = require("../utils/utils");
const mixpanel = require("../services/mixpanel");

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
    const { role, id } = req.query;
    if (!!nftId) {
      let dataObj = await NftModel.findOne({ _id: nftId })
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
          // { path: "lendBorrowOffers.bidder", select: userSelectQuery },
        ])
        .select(nftSelectQuery)
        .lean();
      let nftData = { ...dataObj };
      nftData.history = dataObj.history.sort((a, b) => {
        return b.createdAt - a.createdAt;
      });

      let auctionData = await AuctionModel.find({
        asset: nftId,
        // status: "active",
        cancelled: false,
      });
      let highestBid = null;
      if (auctionData.length) {
        highestBid = !!auctionData[0].bids[auctionData[0].bids.length - 1]
          ? auctionData[0].bids[auctionData[0].bids.length - 1].amount
          : null;
      }

      if (nftData) {
        if (id && role === "user") {
          let user = await UserModel.findOne({ _id: id });
          if (user && user.favouriteNFT.includes(nftData._id)) {
            res.status(200).json({
              success: true,
              data: { ...nftData, favourite: true, highestBid },
            });
          } else {
            res.status(200).json({
              success: true,
              data: { ...nftData, favourite: false, highestBid },
            });
          }
        } else if (id && role === "validator") {
          let validator = await ValidatorModel.findOne({ _id: id });
          if (validator && validator.favouriteNFT.includes(nftData._id)) {
            res.status(200).json({
              success: true,
              data: { ...nftData, favourite: true, highestBid },
            });
          } else {
            res.status(200).json({
              success: true,
              data: { ...nftData, favourite: false, highestBid },
            });
          }
        } else {
          res.status(200).json({
            success: true,
            data: { ...nftData, favourite: false, highestBid },
          });
        }
      } else {
        res.status(400).json({ success: false, data: {} });
      }
    } else {
      res.status(400).json({ success: false });
    }
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.createNft = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
    const { id, wallet_address, role } = req.user;
    NftModel.create(
      {
        ...req.body,
        nftOwner: id,
        nftOwnerType: Role[role],
        nftOwnerAddress: wallet_address,
        nftCreator: id,
        nftCreatorType: Role[role],
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
              assetCollection: doc.nftCollection,
              statusText: "NFT Created",
            });
            await mixpanel.track("Asset minted", {
              distinct_id: id,
              asset: doc._id,
              assetName: doc.name,
              assetCollection: doc.nftCollection,
              asset_type: doc.assetType[0],
              asset_value: doc.valueOfAsset.value,
              asset_token: doc.valueOfAsset.unit,
              asset_orignal_date: doc.assetOriginationDate,
              ip: remoteIp,
            });
            res.status(201).json({
              success: true,
              _id: doc._id,
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
    const remoteIp = getRemoteIp(req);
    const { receiver_address } = req.body;
    const { assetId } = req.params;
    const { wallet_address, id, role } = req.user;
    let userData = await UserModel.findOne({
      wallet_address: receiver_address,
    });
    if (userData) {
      let data = await NftModel.findOneAndUpdate(
        { _id: assetId, nftOwnerAddress: wallet_address },
        {
          nftOwnerAddress: receiver_address,
          nftOwner: userData._id,
          nftOwnerType: Role[userData.role],
          $push: {
            history: {
              action: "Transfered asset",
              user: id,
            },
          },
        }
      );
      if (data) {
        let validationData = await NFTValidationModel.findOneAndUpdate(
          {
            asset: assetId,
          },
          {
            assetOwnerAddress: userData.wallet_address,
            assetOwner: userData._id,
          }
        );
        if (validationData) {
          let activity = await UserActivityModel.insertMany([
            {
              userAddress: wallet_address,
              user: id,
              asset: data._id,
              assetName: data.name,
              assetCollection: data.nftCollection,
              statusText: "NFT Transfered",
            },
            {
              userAddress: userData.wallet_address,
              user: userData._id,
              asset: data._id,
              assetName: data.name,
              assetCollection: data.nftCollection,
              statusText: "NFT Received",
            },
          ]);
          if (role === "validator") {
            let notification = await NotificationModel.create({
              nft: data._id,
              category: "asset-transfer-validator",
              user: userData._id,
              validator: id,
            });
          } else {
            let notification = await NotificationModel.create({
              nft: data._id,
              category: "asset-transfer",
              user: userData._id,
              user2: id,
            });
          }
          if (notification) {
            await mixpanel.track("Asset transferred", {
              distinct_id: id,
              asset: data._id,
              asset_type: data.assetType[0],
              to: userData._id,
              ip: remoteIp,
            });
            res.status(201).json({
              success: true,
              message: "Asset transferred successfully",
            });
          }
        } else {
          res.status(401).json({
            success: false,
            message: "Failed to update validation data",
          });
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
    const remoteIp = getRemoteIp(req);
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
              },
            }
          );
          if (data) {
            // let activity = await UserActivityModel.create({
            //   userAddress: wallet_address,
            //   user: id,
            //   asset: data._id,
            //   assetName: data.name,
            //   assetCollection: data.nftCollection,
            //   statusText: "NFT Deleted",
            // });
            await mixpanel.track("Asset deleted", {
              distinct_id: id,
              asset: assetId,
              ip: remoteIp,
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
    const remoteIp = getRemoteIp(req);
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
                  nftOwnerType: Role["validator"],
                  validationType: null,
                  validationAmount: null,
                  validationDuration: null,
                  validationRoyality: null,
                  validationDocuments: null,
                  requestExpiresOn: null,
                  validationState: "unvalidated",
                  validationExpired: false,
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
                  assetCollection: nftData.nftCollection,
                  statusText: "Burned",
                });
                let notification = await NotificationModel.create({
                  nft: nftData._id,
                  category: "asset-burned",
                  user: nftData.nftOwner,
                  validator: validationData.validator,
                });
                if (notification) {
                  await mixpanel.track("Asset burned", {
                    distinct_id: id,
                    asset: assetId,
                    burned_amount: nftData.validationAmount,
                    asset_type: data.assetType[0],
                    ip: remoteIp,
                  });
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
