const ValidatorModel = require("../models/Validator");
const UserModel = require("../models/User");
const NFTValidationModel = require("../models/NFTValidation");
const ValidatorActivityModel = require("../models/ValidatorActivity");
const NftModel = require("../models/NFT");
const asyncHandler = require("../middlewares/async");
const crypto = require("crypto");
const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");
const { addDays } = require("date-fns");
const {
  activitySelectQuery,
  nftActivitySelectQuery,
  validatorSelectQuery,
  validatedAssetSelectQuery,
  nftSelectQuery,
} = require("../utils/selectQuery");
const UserActivityModel = require("../models/UserActivity");

exports.generateNonce = asyncHandler(async (req, res, next) => {
  try {
    const { wallet_address } = req.params;

    const user = await UserModel.findOne({ wallet_address });

    if (!user) {
      const validator = await ValidatorModel.findOne({
        wallet_address,
      });

      const signatureMessage = crypto.randomBytes(32).toString("hex");

      if (!validator) {
        await ValidatorModel.create({
          wallet_address,
          signatureMessage,
          profileImage: "",
          bannerImage: "",
          name: "",
          username: "",
          bio: "",
          email: "",
          role: "validator",
          document: "",
        });
      } else {
        await ValidatorModel.findOneAndUpdate(
          { wallet_address },
          { signatureMessage }
        );
      }

      res.status(201).json({ success: true, signatureMessage });
    } else {
      res.status(400).json({ success: false, error: "Please login as user" });
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
      const validator = await ValidatorModel.findOne({
        wallet_address,
      });

      if (validator) {
        let signerAddr;
        try {
          signerAddr = await ethers.utils.verifyMessage(
            validator.signatureMessage,
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
            { id: validator._id, wallet_address, role: validator.role },
            process.env.JWT_SECRET,
            {
              expiresIn: process.env.JWT_EXPIRE,
            }
          );
          res.status(201).json({
            success: true,
            token,
            verificationStatus: validator.username ? true : false,
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

exports.onboardValidator = asyncHandler(async (req, res, next) => {
  try {
    ValidatorModel.findOneAndUpdate(
      { wallet_address: req.user.wallet_address },
      { ...req.body },
      null,
      (err, docs) => {
        if (err) {
          res.status(400).json({ success: false });
        } else {
          res.status(201).json({ success: true });
        }
      }
    );
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.fetchValidators = asyncHandler(async (req, res, next) => {
  try {
    res.status(200).json(res.advancedResults);
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.fetchValidatorById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    ValidatorModel.findById(id)
      .select(validatorSelectQuery)
      .exec(function (err, validator) {
        if (err) {
          res.status(400).json({ success: false, data: {} });
        } else {
          res.status(200).json({ success: true, data: validator });
        }
      });
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.fetchValidatorByAddress = asyncHandler(async (req, res, next) => {
  try {
    const { wallet_address } = req.params;
    ValidatorModel.findOne({ wallet_address }, (err, doc) => {
      if (err) {
        res.status(200).json({ success: false, data: {} });
      } else {
        if (!!doc) {
          res.status(200).json({ success: true, data: doc });
        } else {
          res.status(400).json({
            success: false,
            data: {},
            message: "Wrong wallet address",
          });
        }
      }
    })
      .select("-signatureMessage -__v -createdAt -updatedAt")
      .lean();
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.updateValidator = asyncHandler(async (req, res, next) => {
  try {
    const { wallet_address } = req.params;
    ValidatorModel.findOneAndUpdate(
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

exports.fetchAllValidationRequest = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, search } = req.query;

    let queryStr = {
      validatorAddress: req.user.wallet_address,
      requestState: "unvalidated"
    };

    if (search) {
      queryStr = { ...queryStr, assetName: { $regex: search, $options: "i" } };
    }

    query = NFTValidationModel.find(queryStr).populate([
      { path: "asset", select: "name mediaLinks assetType _id" },
      { path: "assetOwner", select: "name profileImage bannerImage _id" },
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
    const total = await NFTValidationModel.countDocuments(queryStr);
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

exports.validateAsset = asyncHandler(async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const {
      validationType,
      validationAmount,
      validationDuration,
      validationRoyality,
      validationDocuments,
      contractAddress,
    } = req.body;
    const { wallet_address, id } = req.user;
    const data = await NFTValidationModel.findById(requestId);
    if (data.validatorAddress === wallet_address) {
      if (data.requestState === "pending") {
        NFTValidationModel.findOneAndUpdate(
          { _id: requestId },
          {
            validationType,
            validationAmount,
            validationDuration,
            validationRoyality,
            validationDocuments,
            requestExpiresOn: addDays(new Date(), validationDuration),
            requestState: "validated",
            validationCount: 1,
            erc20ContractAddress: contractAddress,
            fundBalance: validationAmount,
          },
          async (err, doc) => {
            if (err) {
              res.status(401).json({ success: false });
            } else {
              if (!!doc) {
                NftModel.findOneAndUpdate(
                  { _id: data.asset },
                  {
                    validationType,
                    validationAmount,
                    validationDuration,
                    validationRoyality,
                    validationDocuments,
                    requestExpiresOn: addDays(new Date(), validationDuration),
                    validationState: "validated",
                    validationCount: 1,
                    erc20ContractAddress: contractAddress,
                    fundBalance: validationAmount,
                    $push: {
                      history: {
                        action: "validated",
                        validator: id,
                      },
                    },
                  },
                  async (err, item) => {
                    if (!!item) {
                      let activity = await ValidatorActivityModel.create({
                        validatorAddress: wallet_address,
                        validator: id,
                        asset: data.asset,
                        assetOwner: data.assetOwnerAddress,
                        assetName: data.assetName,
                        statusText: "Asset validated",
                      });
                      let nftData = await NftModel.findOneAndUpdate(
                        { _id: data.asset },
                        {
                          validator: id,
                          validatorAddress: wallet_address,
                        }
                      );
                      if (activity) {
                        res.status(201).json({
                          success: true,
                          message: "Asset validated successfully",
                        });
                      }
                    } else {
                      res.status(401).json({ success: false });
                    }
                  }
                );
              } else {
                res
                  .status(401)
                  .json({ success: false, message: "Wrong request" });
              }
            }
          }
        );
      } else {
        res.status(403).json({ success: false, message: "Forbidden Action" });
      }
    } else {
      res.status(403).json({ success: false, message: "Forbidden Action" });
    }
  } catch (err) {
    res.status(401).json({ success: false, err });
  }
});

exports.addMoreFunds = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { amount } = req.body;
    const { wallet_address, id } = req.user;
    const data = await NFTValidationModel.findOne({ asset: assetId });
    if (data) {
      NFTValidationModel.findOneAndUpdate(
        { _id: data._id },
        {
          validationAmount: data.validationAmount + amount,
          fundBalance: data.fundBalance + amount,
        },
        null,
        async (err, doc) => {
          if (err) {
            res.status(401).json({
              success: false,
              message: "Failed to add more funds",
            });
          } else {
            if (!!doc) {
              let nftData = await NftModel.findOneAndUpdate(
                { _id: assetId },
                {
                  validationAmount: data.validationAmount + amount,
                  fundBalance: data.fundBalance + amount,
                }
              );
              let activity = await ValidatorActivityModel.create({
                validatorAddress: wallet_address,
                validator: id,
                asset: data.asset,
                assetOwner: data.assetOwnerAddress,
                assetName: data.assetName,
                statusText: "Added more funds",
              });
              if (activity) {
                res.status(201).json({
                  success: true,
                  message: "Successfully added more funds",
                });
              }
            } else {
              res
                .status(400)
                .json({ success: false, message: "Wrong wallet address" });
            }
          }
        }
      );
    } else {
      res
        .status(400)
        .json({ success: false, message: "No request to add more funds" });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.reValidateAsset = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;
  const {
    validationType,
    validationAmount,
    validationDuration,
    validationRoyality,
    validationDocuments,
  } = req.body;
  const { wallet_address, id } = req.user;
  const data = await NFTValidationModel.findById(requestId);
  if (data.validatorAddress === wallet_address) {
    if (data.validationState === "pending") {
      NFTValidationModel.findOneAndUpdate(
        { _id: requestId },
        {
          validationType,
          validationAmount: data.validationAmount + validationAmount,
          validationDuration,
          validationRoyality,
          validationDocuments,
          requestExpiresOn: addDays(new Date(), validationDuration),
          requestState: "validated",
          validationCount: data.validationCount + 1,
          validationExpired: false,
          fundBalance: data.fundBalance + validationAmount,
        },
        async (err, doc) => {
          if (err) {
            res.status(401).json({ success: false });
          } else {
            if (!!doc) {
              NftModel.findOneAndUpdate(
                { _id: data.asset },
                {
                  validationType,
                  validationAmount: data.validationAmount + validationAmount,
                  validationDuration,
                  validationRoyality,
                  validationDocuments,
                  requestExpiresOn: addDays(new Date(), validationDuration),
                  validationState: "validated",
                  validationCount: data.validationCount + 1,
                  validationExpired: false,
                  fundBalance: data.fundBalance + validationAmount,
                },
                async (err, item) => {
                  if (!!item) {
                    let activity = await ValidatorActivityModel.create({
                      validatorAddress: wallet_address,
                      validator: id,
                      asset: data.asset,
                      assetOwner: data.assetOwnerAddress,
                      assetName: data.assetName,
                      statusText: "Asset revalidated",
                    });
                    if (activity) {
                      res.status(201).json({
                        success: true,
                        message: "Asset revalidated successfully",
                      });
                    }
                  } else {
                    res.status(401).json({ success: false });
                  }
                }
              );
            } else {
              res
                .status(401)
                .json({ success: false, message: "Wrong request" });
            }
          }
        }
      );
    } else {
      res.status(403).json({ success: false, message: "Forbidden Action" });
    }
  } else {
    res.status(403).json({ success: false, message: "Forbidden Action" });
  }
});

exports.fetchActivites = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby } = req.query;

    let queryStr = {
      validatorAddress: req.user.wallet_address,
    };

    query = ValidatorActivityModel.find(queryStr)
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
    const total = await ValidatorActivityModel.countDocuments(queryStr);
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

exports.rejectValidationRequest = asyncHandler(async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { wallet_address } = req.user;
    NFTValidationModel.findOneAndDelete(
      { _id: requestId },
      async (err, doc) => {
        if (err) {
          res.status(200).json({ success: false, data: {} });
        } else {
          if (!!doc) {
            let nftData = await NftModel.findOneAndUpdate(
              { _id: doc.asset },
              {
                validationState: "unvalidated",
              }
            );
            let activity = await UserActivityModel.create({
              userAddress: doc.assetOwnerAddress,
              user: doc.assetOwner,
              asset: doc.asset,
              assetName: doc.assetName,
              statusText: `Validation request rejected by validator ${wallet_address}`,
            });
            if (activity) {
              res.status(200).json({
                success: true,
                message: "Validation request rejected",
              });
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

exports.fetchValidatedAssets = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby } = req.query;

    let queryStr = {
      validatorAddress: req.user.wallet_address,
      validationState: "validated",
    };

    query = NftModel.find(queryStr);

    query = query.select(validatedAssetSelectQuery);

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

exports.fetchAllRedeemRequests = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby } = req.query;

    let queryStr = {
      validatorAddress: req.user.wallet_address,
      redeemRequest: "true",
    };

    query = NftModel.find(queryStr).select(nftSelectQuery);

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

exports.acceptRedeemRequest = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    const data = await NftModel.findOne({
      _id: assetId,
    });
    if (data.validatorAddress === wallet_address) {
      if (data.validationState === "validated") {
        if (data.redeemRequest === "true") {
          let nftData = await NftModel.findOneAndUpdate(
            { _id: assetId },
            {
              redeemRequest: "accepted",
            }
          );
          if (nftData) {
            // let activity = await UserActivityModel.create({
            //   userAddress: wallet_address,
            //   user: id,
            //   asset,
            //   assetName: nftData.name,
            //   statusText: "Sent redeem request",
            // });
            res.status(201).json({
              success: true,
              message: "Redeem request accepted successfully",
            });
          } else {
            res.status(401).json({
              success: false,
              message: "Failed to accept redeem request",
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
        message: "Only asset validator can accept redeem request",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.cancelRedeemRequest = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { wallet_address } = req.user;
    const data = await NftModel.findOne({
      _id: assetId,
    });
    if (data.validatorAddress === wallet_address) {
      if (data.validationState === "validated") {
        if (data.redeemRequest === "true") {
          let nftData = await NftModel.findOneAndUpdate(
            { _id: assetId },
            {
              redeemRequest: "rejected",
            }
          );
          if (nftData) {
            // let activity = await UserActivityModel.create({
            //   userAddress: wallet_address,
            //   user: id,
            //   asset,
            //   assetName: nftData.name,
            //   statusText: "Sent redeem request",
            // });
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
        res
          .status(401)
          .json({ success: false, message: "Asset is not validated" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only asset validator can cancel redeem request",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});
