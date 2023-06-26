const UserModel = require("../models/User");
const ValidatorModel = require("../models/Validator");
const NFTValidationModel = require("../models/NFTValidation");
const UserActivityModel = require("../models/UserActivity");
const CollectionModel = require("../models/Collection");
const NftModel = require("../models/NFT");
const OfferModel = require("../models/Offer");
const NotificationModel = require("../models/Notification");
const asyncHandler = require("../middlewares/async");
const crypto = require("crypto");
const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");
const {
  userSelectQuery,
  activitySelectQuery,
  nftActivitySelectQuery,
  collectionSelectQuery,
  validatorSelectQuery,
  nftSelectQuery,
  userHistorySelectQuery,
  validatorHistorySelectQuery,
} = require("../utils/selectQuery");
const { isBefore } = require("date-fns");

exports.generateNonce = asyncHandler(async (req, res, next) => {
  try {
    const { wallet_address } = req.params;
    const validator = await ValidatorModel.findOne({ wallet_address });
    if (!validator) {
      const user = await UserModel.findOne({
        wallet_address,
      });
      const signatureMessage = crypto.randomBytes(32).toString("hex");

      if (!user) {
        await UserModel.create({
          wallet_address,
          signatureMessage,
          name: "",
          username: "",
          email: "",
          role: "user",
          termOfService: false,
        });
      } else {
        await UserModel.findOneAndUpdate(
          { wallet_address },
          { signatureMessage }
        );
      }

      res.status(201).json({ success: true, signatureMessage });
    } else {
      res
        .status(400)
        .json({ success: false, error: "Please login as validator" });
    }
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.validateSignature = asyncHandler(async (req, res, next) => {
  try {
    const { wallet_address } = req.params;
    const { signature } = req.body;
    if (wallet_address.length && signature.length) {
      const user = await UserModel.findOne({
        wallet_address,
      });

      if (user) {
        let signerAddr;
        try {
          signerAddr = await ethers.utils.verifyMessage(
            user.signatureMessage,
            signature
          );
        } catch (err) {
          res.status(400).json({
            success: false,
            error: "Wrong signature",
          });
        }

        if (signerAddr === wallet_address) {
          const token = jwt.sign(
            { id: user._id, wallet_address, role: user.role },
            process.env.JWT_SECRET,
            {
              expiresIn: process.env.JWT_EXPIRE,
            }
          );
          res.status(201).json({
            success: true,
            id: user._id,
            token,
            verificationStatus: user.termOfService,
          });
        } else {
          res.status(400).json({
            success: false,
            error: "Wrong signature",
          });
        }
      } else {
        res.status(400).json({
          success: false,
          error: "Wrong wallet address",
        });
      }
    } else {
      res.status(400).json({
        success: false,
        error: "Wrong inputs given",
      });
    }
  } catch (err) {
    res.status(400).json({
      success: false,
    });
  }
});

exports.onboardUser = asyncHandler(async (req, res, next) => {
  try {
    UserModel.findOneAndUpdate(
      { wallet_address: req.user.wallet_address },
      { ...req.body },
      null,
      (err, docs) => {
        if (err) {
          res.status(400).json({ success: false });
        } else {
          res.status(200).json({ success: true });
        }
      }
    );
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.fetchUsers = asyncHandler(async (req, res, next) => {
  try {
    res.status(200).json(res.advancedResults);
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.fetchUserById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    UserModel.findOne({ _id: id }, (err, doc) => {
      if (err) {
        res.status(400).json({ success: false, data: {} });
      } else {
        if (!!doc) {
          NftModel.find(
            {
              nftOwnerAddress: doc.wallet_address,
            },
            (err, assetData) => {
              if (err) {
                res.status(400).json({ success: false, data: {} });
              } else {
                NftModel.find(
                  {
                    nftOwnerAddress: doc.wallet_address,
                    validationState: "validated",
                  },
                  (err, validatedData) => {
                    if (err) {
                      res.status(400).json({ success: false, data: {} });
                    } else {
                      let tvl = 0;
                      for (let i = 0; i < validatedData.length; i++) {
                        tvl += validatedData[i].validationAmount;
                      }
                      res.status(200).json({
                        success: true,
                        data: {
                          ...doc,
                          totalAssets: assetData.length,
                          validatedAssets: validatedData.length,
                          tvl,
                        },
                      });
                    }
                  }
                ).lean();
              }
            }
          ).lean();
        } else {
          res.status(400).json({
            success: false,
            data: {},
            message: "Wrong wallet address",
          });
        }
      }
    })
      .select(userSelectQuery)
      .lean();
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.fetchUserByAddress = asyncHandler(async (req, res, next) => {
  try {
    const { wallet_address } = req.params;
    UserModel.findOne({ wallet_address }, (err, doc) => {
      if (err) {
        res.status(400).json({ success: false, data: {} });
      } else {
        if (!!doc) {
          NftModel.find(
            {
              nftOwnerAddress: wallet_address,
            },
            (err, assetData) => {
              if (err) {
                res.status(400).json({ success: false, data: {} });
              } else {
                NftModel.find(
                  {
                    nftOwnerAddress: wallet_address,
                    validationState: "validated",
                  },
                  (err, validatedData) => {
                    if (err) {
                      res.status(400).json({ success: false, data: {} });
                    } else {
                      let tvl = 0;
                      for (let i = 0; i < validatedData.length; i++) {
                        tvl += validatedData[i].validationAmount;
                      }
                      res.status(200).json({
                        success: true,
                        data: {
                          ...doc,
                          totalAssets: assetData.length,
                          validatedAssets: validatedData.length,
                          tvl,
                        },
                      });
                    }
                  }
                ).lean();
              }
            }
          ).lean();
        } else {
          res.status(400).json({
            success: false,
            data: {},
            message: "Wrong wallet address",
          });
        }
      }
    })
      .select(userSelectQuery)
      .lean();
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.updateUser = asyncHandler(async (req, res, next) => {
  try {
    const { wallet_address } = req.params;
    UserModel.findOneAndUpdate(
      { wallet_address },
      { ...req.body },
      null,
      (err, doc) => {
        if (err) {
          res
            .status(400)
            .json({ success: false, message: "Profile failed to update" });
        } else {
          if (!!doc) {
            res
              .status(201)
              .json({ success: true, message: "Profile successfully updated" });
          } else {
            res
              .status(400)
              .json({ success: false, message: "Wrong wallet address" });
          }
        }
      }
    );
  } catch (err) {
    res
      .status(400)
      .json({ success: false, message: "Profile failed to update" });
  }
});

exports.fetchUserAssetNFTs = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, search, type, blockchain, validation } = req.query;
    let queryStr = {
      // nftOwnerAddress: req.user.wallet_address,
      nftOwner: req.params.userId,
      // name: { $regex: search, $options: "i" },
      // assetType: { $all: assetType },
      // blockchain,
      // validationState
    };

    if (search) {
      queryStr = { ...queryStr, name: { $regex: search, $options: "i" } };
    }

    if (blockchain) {
      queryStr = { ...queryStr, blockchain: { $in: blockchain.split(",") } };
    }

    if (type) {
      queryStr = { ...queryStr, assetType: { $in: type.split(",") } };
    }

    if (validation) {
      queryStr = {
        ...queryStr,
        validationState: { $in: validation.split(",") },
      };
    }

    query = NftModel.find(queryStr).populate([
      {
        path: "nftCollection",
        select: collectionSelectQuery,
      },
      { path: "nftOwner", select: userSelectQuery },
      { path: "nftCreator", select: userSelectQuery },
      { path: "validator", select: validatorSelectQuery },
    ]);

    if (sortby) {
      const sortBy = sortby.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await NftModel.countDocuments(queryStr);
    query = query.skip(startIndex).limit(limit);

    const results = await query;

    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    return res.status(200).json({
      success: true,
      count: results.length,
      pagination,
      data: results,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
      message: "Failed to execute",
      err,
    });
  }
});

exports.fetchUsersValidatedAssetNFTs = asyncHandler(async (req, res, next) => {
  try {
    let query;
    const { sortby } = req.query;

    let queryStr = {
      nftOwner: req.user.id,
      state: "none",
      validationState: "validated",
      swapState: "none",
    };

    query = NftModel.find(queryStr).populate([
      {
        path: "nftCollection",
        select: collectionSelectQuery,
      },
      { path: "nftOwner", select: userSelectQuery },
      { path: "nftCreator", select: userSelectQuery },
      { path: "validator", select: validatorSelectQuery },
    ]);

    if (sortby) {
      const sortBy = sortby.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await NftModel.countDocuments(queryStr);
    query = query.skip(startIndex).limit(limit);

    const results = await query;

    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    return res.status(200).json({
      success: true,
      count: results.length,
      pagination,
      data: results,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
      message: "Failed to execute",
      err,
    });
  }
});

exports.sendValidationRequest = asyncHandler(async (req, res, next) => {
  try {
    const { asset, validator, validatorAddress } = req.body;
    const { wallet_address, id } = req.user;
    const data = await NFTValidationModel.findOne({
      assetOwnerAddress: wallet_address,
      asset,
    });
    if (!data) {
      let nftData = await NftModel.findOneAndUpdate(
        { _id: asset },
        {
          validationState: "pending",
          validator,
          validatorAddress,
        }
      );
      if (nftData) {
        NFTValidationModel.create(
          {
            ...req.body,
            assetOwnerAddress: wallet_address,
            assetOwner: id,
            assetName: nftData.name,
            requestState: "pending",
          },
          async (err, doc) => {
            if (err) {
              res.status(401).json({ success: false });
            } else {
              if (!!doc) {
                let validationData = await NftModel.findOneAndUpdate(
                  { _id: asset },
                  { validationId: doc._id }
                );
                let activity = await UserActivityModel.create({
                  userAddress: wallet_address,
                  user: id,
                  asset,
                  assetName: nftData.name,
                  assetCollection: nftData.nftCollection,
                  statusText: "Sent validation request",
                });
                if (activity) {
                  let notification = await NotificationModel.create({
                    nft: asset,
                    category: "asset-validation-request",
                    user: id,
                    validator,
                  });
                  if (notification) {
                    res.status(201).json({
                      success: true,
                      message: "Validation request sent",
                    });
                  }
                }
              } else {
                res.status(401).json({ success: false, message: "not done" });
              }
            }
          }
        );
      } else {
        res.status(401).json({ success: false });
      }
    } else {
      res.status(401).json({ success: false, message: "Request already sent" });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.sendExtendValidationRequest = asyncHandler(async (req, res, next) => {
  try {
    const { asset } = req.body;
    const { wallet_address, id } = req.user;
    const data = await NFTValidationModel.findOne({
      assetOwnerAddress: wallet_address,
      asset,
    });
    if (isBefore(data.requestExpiresOn, new Date()) & data.validationExpired) {
      NFTValidationModel.findOneAndUpdate(
        { _id: data._id },
        { requestState: "pending" },
        null,
        async (err, doc) => {
          if (err) {
            res.status(401).json({ success: false });
          } else {
            if (!!doc) {
              const nftData = await NftModel.findOneAndUpdate(
                { _id: asset },
                { validationState: "pending" },
                {
                  new: true,
                }
              );
              if (nftData) {
                let activity = await UserActivityModel.create({
                  userAddress: wallet_address,
                  user: id,
                  asset,
                  assetName: nftData.name,
                  assetCollection: nftData.nftCollection,
                  statusText: "Sent revalidation request",
                });
                if (activity) {
                  let notification = await NotificationModel.create({
                    nft: asset,
                    category: "asset-validation-extend-request",
                    user: id,
                    validator: data.validator,
                  });
                  if (notification) {
                    res.status(201).json({
                      success: true,
                      message: "Extend validation request sent",
                    });
                  }
                }
              }
            } else {
              res.status(201).json({
                success: false,
                message: "Failed to send validation request",
              });
            }
          }
        }
      );
    } else {
      res
        .status(400)
        .json({ success: false, message: "Asset validity is not expired" });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.fetchActivites = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, search, type } = req.query;

    let queryStr = {
      userAddress: req.user.wallet_address,
    };

    if (search) {
      queryStr = { ...queryStr, assetName: { $regex: search, $options: "i" } };
    }

    if (type) {
      queryStr = { ...queryStr, statusText: { $in: type.split(",") } };
    }

    query = UserActivityModel.find(queryStr)
      .select(activitySelectQuery)
      .populate({ path: "asset", select: nftActivitySelectQuery });

    if (sortby) {
      const sortBy = sortby.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await UserActivityModel.countDocuments(queryStr);
    query = query.skip(startIndex).limit(limit);

    const results = await query;

    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    return res.status(200).json({
      success: true,
      count: results.length,
      pagination,
      data: results,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
      message: "Failed to execute",
    });
  }
});

exports.fetchCollections = asyncHandler(async (req, res, next) => {
  try {
    const { wallet_address } = req.user;
    let query;
    const { sortby, search, type, blockchain, fetch } = req.query;

    let queryStr = {
      $or: [{ name: "Aconomy" }, { collectionOwnerAddress: wallet_address }],
    };

    if (search) {
      queryStr = { ...queryStr, name: { $regex: search, $options: "i" } };
    }

    if (type) {
      queryStr = { ...queryStr, assetType: { $in: type.split(",") } };
    }

    if (blockchain) {
      queryStr = { ...queryStr, blockchain: { $in: blockchain.split(",") } };
    }

    query = CollectionModel.find(queryStr).select(collectionSelectQuery);

    if (sortby) {
      const sortBy = sortby.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    if (!fetch) {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 30;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const total = await CollectionModel.countDocuments(queryStr);
      query = query.skip(startIndex).limit(limit);

      const results = await query.lean();

      let dataArr = [];
      for (let i = 0; i < results.length; i++) {
        let data = await NftModel.find({
          nftCollection: results[i]._id,
          nftOwner: { $ne: null },
        })
          .select(
            "_id validationAmount validationState state nftOwner nftOwnerType nftOwnerAddress tokenId"
          )
          .populate({ path: "nftOwner", select: "_id name wallet_address" })
          .lean();
        let floor_price,
          tvl = 0,
          listed = 0,
          owners = [];
        for (let j = 0; j < data.length; j++) {
          if (data.validationState === "validated") {
            tvl += data[j].validationAmount;
          }
          if (data[j].state === "sale" || data[j].state === "auction") {
            listed += 1;
          }
          owners.push({
            name: data[j].nftOwner.name,
            wallet_address: data[j].nftOwner.wallet_address,
          });
        }
        dataArr.push({
          ...results[i],
          tvl,
          listed: data.length ? Math.round((listed / data.length) * 100) : 0,
          totalAssets: data.length,
          owners: [
            ...new Map(
              owners.map((item) => [item["wallet_address"], item])
            ).values(),
          ],
        });
      }

      const pagination = {};

      if (endIndex < total) {
        pagination.next = {
          page: page + 1,
          limit,
        };
      }

      if (startIndex > 0) {
        pagination.prev = {
          page: page - 1,
          limit,
        };
      }
      return res.status(200).json({
        success: true,
        count: results.length,
        pagination,
        data: dataArr,
      });
    }

    const results = await query.lean();

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
      message: "Failed to execute",
    });
  }
});

exports.checkUsernameAvailability = asyncHandler(async (req, res, next) => {
  try {
    const { username } = req.body;
    if (username === "") {
      res.status(200).json({ success: false, message: "Invalid username" });
    } else {
      UserModel.findOne({ username }, (err, userData) => {
        if (err) {
          res.status(400).json({ success: false });
        } else {
          if (userData) {
            res
              .status(200)
              .json({ success: false, message: "username is taken" });
          } else {
            ValidatorModel.findOne({ username }, (err, validatorData) => {
              if (err) {
                res.status(400).json({ success: false });
              } else {
                if (validatorData) {
                  res
                    .status(200)
                    .json({ success: false, message: "username is taken" });
                } else {
                  res
                    .status(200)
                    .json({ success: true, message: "username is available" });
                }
              }
            });
          }
        }
      });
    }
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.cancelValidationRequest = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    NFTValidationModel.findOneAndDelete(
      { asset: assetId },
      async (err, doc) => {
        if (err) {
          res.status(200).json({ success: false, data: {} });
        } else {
          if (!!doc) {
            let nftData = await NftModel.findOneAndUpdate(
              { _id: assetId },
              {
                validationState: "unvalidated",
              }
            );
            if (nftData) {
              res.status(200).json({
                success: true,
                message: "Validation request cancelled",
              });
            } else {
              res.status(400).json({ success: false });
            }
          } else {
            res.status(400).json({
              success: false,
              message: "Wrong inputs",
            });
          }
        }
      }
    );
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.sendRedeemRequest = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    const data = await NftModel.findOne({
      _id: assetId,
    });
    if (data.nftOwnerAddress === wallet_address) {
      if (data.validationState === "validated") {
        if (
          data.redeemRequest === "false" ||
          data.redeemRequest === "redeemed" ||
          data.redeemRequest === "rejected"
        ) {
          let nftData = await NftModel.findOneAndUpdate(
            { _id: assetId },
            {
              redeemRequest: "true",
            }
          );
          if (nftData) {
            let activity = await UserActivityModel.create({
              userAddress: wallet_address,
              user: id,
              asset: assetId,
              assetName: nftData.name,
              assetCollection: nftData.nftCollection,
              statusText: "Sent redeem request",
            });
            let notification = await NotificationModel.create({
              nft: assetId,
              category: "sent-redeem-request",
              validator: nftData.validator,
            });
            if (notification) {
              res.status(201).json({
                success: true,
                message: "Redeem request sent successfully",
              });
            }
          } else {
            res.status(401).json({
              success: false,
              message: "Failed to send redeem request",
            });
          }
        } else {
          res.status(401).json({
            success: false,
            message: "Redeem process already initiated",
          });
        }
      } else {
        res
          .status(401)
          .json({ success: false, message: "Asset is not validated" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only asset owner can send redeem request",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.cancelRedeemRequest = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    const data = await NftModel.findOne({
      _id: assetId,
    });
    if (data.nftOwnerAddress === wallet_address) {
      if (data.redeemRequest === "true") {
        let nftData = await NftModel.findOneAndUpdate(
          { _id: assetId },
          {
            redeemRequest: "false",
          }
        );
        if (nftData) {
          let activity = await UserActivityModel.create({
            userAddress: wallet_address,
            user: id,
            asset: assetId,
            assetName: nftData.name,
            assetCollection: nftData.nftCollection,
            statusText: "Cancelled redeem request",
          });
          res.status(201).json({
            success: true,
            message: "Redeem request cancelled successfully",
          });
        } else {
          res.status(401).json({
            success: false,
            message: "Failed to cancel redeem request",
          });
        }
      } else {
        res.status(401).json({
          success: false,
          message: "Redeem process already initiated",
        });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only asset owner can cancel redeem request",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.redeemAsset = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    const data = await NftModel.findOne({
      _id: assetId,
    });
    if (data.nftOwnerAddress === wallet_address) {
      if (data.validationState === "validated") {
        if (data.redeemRequest === "accepted") {
          let nftData = await NftModel.findOneAndUpdate(
            { _id: assetId },
            {
              redeemRequest: "redeemed",
              validator: null,
              validatorAddress: null,
              validationState: "unvalidated",
              validationType: null,
              validationAmount: null,
              validationDuration: null,
              validationRoyality: null,
              validationDocuments: null,
              $push: {
                history: {
                  action: "Redeemed asset",
                  user: id,
                },
              },
            }
          );
          if (nftData) {
            let validationData = await NFTValidationModel.findOneAndUpdate(
              {
                assetOwnerAddress: wallet_address,
                asset: assetId,
              },
              {
                requestState: "unvalidated",
              }
            );
            let activity = await UserActivityModel.create({
              userAddress: wallet_address,
              user: id,
              asset: assetId,
              assetName: nftData.name,
              assetCollection: nftData.nftCollection,
              statusText: "Asset redeemed",
            });
            let notification = await NotificationModel.insertMany([
              {
                nft: nftData._id,
                category: "nft-redeem-user",
                user: id,
              },
              {
                nft: nftData._id,
                category: "nft-redeem-validator",
                validator: nftData.validator,
              },
            ]);
            if (notification) {
              res.status(201).json({
                success: true,
                message: "Asset redeemed successfully",
              });
            }
          } else {
            res.status(401).json({
              success: false,
              message: "Failed to redeem asset",
            });
          }
        } else {
          res.status(401).json({
            success: false,
            message: "Redeem request not accepted yet",
          });
        }
      } else {
        res
          .status(401)
          .json({ success: false, message: "Asset is not validated" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only asset owner can redeem asset",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.withdrawFunds = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    const { amount } = req.body;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress === wallet_address) {
      if (nftData.validationState === "validated") {
        let availableBalance = nftData.fundBalance;
        if (amount <= availableBalance) {
          let balance = availableBalance - amount;
          let data = await NftModel.findOneAndUpdate(
            { _id: assetId },
            { fundBalance: balance, state: "withdraw" }
          );
          if (data) {
            let validationData = await NFTValidationModel.findOneAndUpdate(
              {
                assetOwnerAddress: wallet_address,
                asset: assetId,
              },
              {
                fundBalance: balance,
              }
            );
            let activity = await UserActivityModel.create({
              userAddress: wallet_address,
              user: id,
              asset: nftData._id,
              assetName: nftData.name,
              assetCollection: nftData.nftCollection,
              statusText: "Withdrawn fund",
            });
            let notification = await NotificationModel.create({
              nft: nftData._id,
              category: "validation-fund-withdraw",
              validator: nftData.validator,
              user: id,
              amount,
            });
            if (notification) {
              res.status(201).json({
                success: true,
                message: "Amount withdrawn successfully",
              });
            }
          } else {
            res
              .status(401)
              .json({ success: false, message: "Failed to withdraw amount" });
          }
        } else {
          res
            .status(401)
            .json({ success: false, message: "Insufficient balance" });
        }
      } else {
        res
          .status(401)
          .json({ success: false, message: "Asset is not validated" });
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

exports.repayFunds = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    const { amount } = req.body;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress === wallet_address) {
      if (nftData.validationState === "validated") {
        if (nftData.state === "withdraw") {
          let availableBalance = nftData.validationAmount - nftData.fundBalance;
          if (amount > 0 && amount <= availableBalance) {
            let data = await NftModel.findOneAndUpdate(
              { _id: assetId },
              {
                fundBalance: nftData.fundBalance + amount,
                state:
                  nftData.fundBalance + amount === nftData.validationAmount
                    ? "none"
                    : "withdraw",
              }
            );
            if (data) {
              let validationData = await NFTValidationModel.findOneAndUpdate(
                {
                  assetOwnerAddress: wallet_address,
                  asset: assetId,
                },
                {
                  fundBalance: nftData.fundBalance + amount,
                }
              );
              let activity = await UserActivityModel.create({
                userAddress: wallet_address,
                user: id,
                asset: nftData._id,
                assetName: nftData.name,
                assetCollection: nftData.nftCollection,
                statusText: "Repaied fund",
              });
              let notification = await NotificationModel.create({
                nft: nftData._id,
                category: "validation-fund-repay",
                validator: nftData.validator,
                user: id,
                amount,
              });
              if (notification) {
                res.status(201).json({
                  success: true,
                  message: "Amount repaid successfully",
                });
              }
            } else {
              res
                .status(401)
                .json({ success: false, message: "Failed to repay amount" });
            }
          } else {
            res
              .status(401)
              .json({ success: false, message: "Balance mismatch" });
          }
        } else {
          res.status(401).json({ success: false, message: "Forbidden action" });
        }
      } else {
        res
          .status(401)
          .json({ success: false, message: "Asset is not validated" });
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

exports.fetchNftForBorrow = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, search, type, blockchain, validation } = req.query;
    const { userId } = req.params;

    let queryStr = {
      nftOwner: userId,
      state: "lendborrow",
    };

    if (search) {
      queryStr = { ...queryStr, name: { $regex: search, $options: "i" } };
    }

    if (blockchain) {
      queryStr = { ...queryStr, blockchain: { $in: blockchain.split(",") } };
    }

    if (type) {
      queryStr = { ...queryStr, assetType: { $in: type.split(",") } };
    }

    if (validation) {
      queryStr = {
        ...queryStr,
        validationState: { $in: validation.split(",") },
      };
    }

    query = NftModel.find(queryStr)
      .select(nftSelectQuery)
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
      ]);

    if (sortby) {
      const sortBy = sortby.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await NftModel.countDocuments(queryStr);
    query = query.skip(startIndex).limit(limit);

    const results = await query;

    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    return res.status(200).json({
      success: true,
      count: results.length,
      pagination,
      data: results,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
      message: "Failed to execute",
    });
  }
});

exports.fetchUserPoolLendings = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby } = req.query;
    const { userId } = req.params;

    let queryStr = {
      lender: userId,
    };

    query = OfferModel.find(queryStr).populate([
      {
        path: "lender",
        select:
          "-assetType -bio -email -signatureMessage -document -createdAt -updatedAt -__v -username -role -termOfService",
      },
      {
        path: "pool",
        select: "-whitelist -lenders -borrowers -__v -updatedAt -description",
        populate: {
          path: "pool_owner",
          model: "Validator",
          select: validatorSelectQuery,
        },
      },
    ]);

    if (sortby) {
      const sortBy = sortby.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await OfferModel.countDocuments(queryStr);
    query = query.skip(startIndex).limit(limit);

    const results = await query;

    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    return res.status(200).json({
      success: true,
      count: results.length,
      pagination,
      data: results,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
      message: "Failed to execute",
    });
  }
});

exports.fetchUserPoolBorrowings = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby } = req.query;
    const { userId } = req.params;

    let queryStr = {
      borrower: userId,
    };

    query = OfferModel.find(queryStr).populate([
      {
        path: "borrower",
        select:
          "-assetType -bio -email -signatureMessage -document -createdAt -updatedAt -__v -username -role -termOfService",
      },
      {
        path: "pool",
        select: "-whitelist -lenders -borrowers -__v -updatedAt -description",
        populate: {
          path: "pool_owner",
          model: "Validator",
          select: validatorSelectQuery,
        },
      },
    ]);

    if (sortby) {
      const sortBy = sortby.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await OfferModel.countDocuments(queryStr);
    query = query.skip(startIndex).limit(limit);

    const results = await query;

    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    return res.status(200).json({
      success: true,
      count: results.length,
      pagination,
      data: results,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
      message: "Failed to execute",
    });
  }
});

exports.fetchUserNFTonSale = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, search, type, blockchain, validation } = req.query;
    const { userId } = req.params;

    let queryStr = {
      $and: [
        { nftOwner: userId },
        { $or: [{ state: "sale" }, { state: "auction" }] },
      ],
    };

    if (search) {
      queryStr = { ...queryStr, name: { $regex: search, $options: "i" } };
    }

    if (blockchain) {
      queryStr = { ...queryStr, blockchain: { $in: blockchain.split(",") } };
    }

    if (type) {
      queryStr = { ...queryStr, assetType: { $in: type.split(",") } };
    }

    if (validation) {
      queryStr = {
        ...queryStr,
        validationState: { $in: validation.split(",") },
      };
    }

    query = NftModel.find(queryStr)
      .select(nftSelectQuery)
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
      ]);

    if (sortby) {
      const sortBy = sortby.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await NftModel.countDocuments(queryStr);
    query = query.skip(startIndex).limit(limit);

    const results = await query;

    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    return res.status(200).json({
      success: true,
      count: results.length,
      pagination,
      data: results,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
      message: "Failed to execute",
    });
  }
});

exports.addNFTtoFavourite = asyncHandler(async (req, res, next) => {
  try {
    const { wallet_address } = req.user;
    const { id } = req.body;

    const favouriteNfts = await UserModel.findOne({
      wallet_address,
    }).select("favouriteNFT");

    let data = favouriteNfts.favouriteNFT.length
      ? favouriteNfts.favouriteNFT
      : [];
    if (data.length) {
      if (data.includes(id)) {
        data = data.filter((d) => d.toString() !== id);
      } else {
        data.push(id);
      }
    } else {
      data.push(id);
    }

    const nft = await UserModel.findOneAndUpdate(
      { wallet_address },
      { favouriteNFT: data }
    );

    if (nft) {
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ success: false });
    }
  } catch (err) {
    res.status(400).json({ success: false, data: [] });
  }
});

exports.getFavouriteNFTs = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.user;
    const nfts = await UserModel.findOne({ _id: id }).populate("favouriteNFT");
    if (nfts && nfts.favouriteNFT.length) {
      res.status(200).json({ success: true, data: nfts.favouriteNFT });
    } else {
      res.status(200).json({ success: true, data: [] });
    }
  } catch (err) {
    res.status(400).json({
      success: false,
      data: {},
    });
  }
});

exports.fetchBurnedNfts = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, search, type, blockchain } = req.query;
    const { id } = req.user;

    let queryStr = {
      previousOwner: id,
      state: "burned",
    };

    if (search) {
      queryStr = { ...queryStr, name: { $regex: search, $options: "i" } };
    }

    if (blockchain) {
      queryStr = { ...queryStr, blockchain: { $in: blockchain.split(",") } };
    }

    if (type) {
      queryStr = { ...queryStr, assetType: { $in: type.split(",") } };
    }

    query = NftModel.find(queryStr)
      .select(nftSelectQuery)
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
      ]);

    if (sortby) {
      const sortBy = sortby.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await NftModel.countDocuments(queryStr);
    query = query.skip(startIndex).limit(limit);

    const results = await query;

    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    return res.status(200).json({
      success: true,
      count: results.length,
      pagination,
      data: results,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
      message: "Failed to execute",
    });
  }
});
