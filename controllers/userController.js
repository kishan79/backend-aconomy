const UserModel = require("../models/User");
const ValidatorModel = require("../models/Validator");
const NFTValidationModel = require("../models/NFTValidation");
const UserActivityModel = require("../models/UserActivity");
const CollectionModel = require("../models/Collection");
const NftModel = require("../models/NFT");
const asyncHandler = require("../middlewares/async");
const crypto = require("crypto");
const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");
const {
  userSelectQuery,
  activitySelectQuery,
  nftActivitySelectQuery,
  collectionSelectQuery,
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
              expiresIn: 60 * 60,
            }
          );
          res.status(201).json({
            success: true,
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
                      res.status(200).json({
                        success: true,
                        data: {
                          ...doc,
                          totalAssets: assetData.length,
                          validatedAssets: validatedData.length,
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

    const { sortby, search, assetType, blockchain, validationState } =
      req.query;
    let queryStr = {
      nftOwnerAddress: req.user.wallet_address,
      // name: { $regex: search, $options: "i" },
      // assetType: { $all: assetType },
      // blockchain,
      // validationState
    };

    // if (search) {
    //   queryStr = { ...queryStr, name: { $regex: search, $options: "i" } };
    // }

    // if (blockchain) {
    //   queryStr = { ...queryStr, blockchain };
    // }

    // if (assetType) {
    //   queryStr = { ...queryStr, assetType: { $all: assetType.split(",") } };
    // }

    // if (validationState) {
    //   queryStr = { ...queryStr, validationState };
    // }

    query = NftModel.find(queryStr);

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
    const { asset, assetName } = req.body;
    const { wallet_address, id } = req.user;
    const data = await NFTValidationModel.findOne({
      assetOwnerAddress: wallet_address,
      asset,
    });
    if (!data) {
      NFTValidationModel.create(
        {
          ...req.body,
          assetOwnerAddress: wallet_address,
          assetOwner: id,
          requestState: "pending",
        },
        async (err, doc) => {
          if (err) {
            res.status(401).json({ success: false });
          } else {
            if (!!doc) {
              let nftData = await NftModel.findOneAndUpdate(
                { _id: asset },
                { validationState: "pending" }
              );
              let activity = await UserActivityModel.create({
                userAddress: wallet_address,
                user: id,
                asset,
                assetName,
                statusText: "Sent validation request",
              });
              if (activity) {
                res
                  .status(201)
                  .json({ success: true, message: "Validation request sent" });
              }
            } else {
              res.status(401).json({ success: false, message: "not done" });
            }
          }
        }
      );
    } else {
      res.status(401).json({ success: false, message: "Request already sent" });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.sendExtendValidationRequest = asyncHandler(async (req, res, next) => {
  try {
    const { asset, assetName } = req.body;
    const { wallet_address, id } = req.user;
    const data = await NFTValidationModel.findOne({
      assetOwnerAddress: wallet_address,
      asset,
    });
    console.log(data.requestExpiresOn, new Date());
    if (isBefore(data.requestExpiresOn, new Date()) & data.validationExpired) {
      NFTValidationModel.findOneAndUpdate(
        { _id: data._id },
        { requestState: "revalidation" },
        null,
        async (err, doc) => {
          if (err) {
            res.status(401).json({ success: false });
          } else {
            if (!!doc) {
              const nftData = await NftModel.findOneAndUpdate(
                { _id: asset },
                { validationState: "revalidation" },
                {
                  new: true,
                }
              );
              if (nftData) {
                let activity = await UserActivityModel.create({
                  userAddress: wallet_address,
                  user: id,
                  asset,
                  assetName,
                  statusText: "Sent revalidation request",
                });
                if (activity) {
                  res.status(201).json({
                    success: true,
                    message: "Extend validation request sent",
                  });
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

    const { sortby } = req.query;

    let queryStr = {
      userAddress: req.user.wallet_address,
    };

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
    const data = await CollectionModel.find({
      $or: [
        { name: "Public Collection" },
        { collectionOwnerAddress: wallet_address },
      ],
    }).select(collectionSelectQuery);
    if (data) {
      res.status(200).json({ success: true, data });
    } else {
      res.status(200).json({ success: true, data: [] });
    }
  } catch (err) {
    res.status(400).json({ success: false });
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
