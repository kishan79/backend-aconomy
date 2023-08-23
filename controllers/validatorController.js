const ValidatorModel = require("../models/Validator");
const UserModel = require("../models/User");
const NFTValidationModel = require("../models/NFTValidation");
const ValidatorActivityModel = require("../models/ValidatorActivity");
const NftModel = require("../models/NFT");
const NotificationModel = require("../models/Notification");
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
  collectionSelectQuery,
  userSelectQuery,
  userHistorySelectQuery,
  validatorHistorySelectQuery,
  redeemNftSelectQuery,
} = require("../utils/selectQuery");
const UserActivityModel = require("../models/UserActivity");
const fetch = require("node-fetch");
const mixpanel = require("../services/mixpanel");
const { getRemoteIp } = require("../utils/utils");

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
    const remoteIp = getRemoteIp(req);
    const { wallet_address } = req.params;
    const { signature, wallet_name } = req.body;
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
          let nftData = await NftModel.find({
            $or: [
              { validatorAddress: wallet_address },
              { nftOwner: validator._id },
            ],
          }).select("_id validationState nftOwner redeemRequest");
          let validatedAssets = 0,
            burnedAssets = 0,
            redeemedAssets = 0;
          for (let i = 0; i < nftData.length; i++) {
            if (nftData[i].validationState === "validated") {
              validatedAssets += 1;
            }
            if (String(nftData[i].nftOwner) === String(validator._id)) {
              burnedAssets += 1;
            }
            if (nftData[i].redeemRequest === "accepted") {
              redeemedAssets += 1;
            }
          }
          await mixpanel.track("Validator logged-in", {
            distinct_id: validator._id,
            wallet_name,
            total_assests: validatedAssets,
            total_validations: validatedAssets,
            total_asset_burned: burnedAssets,
            total_asset_redeemed: redeemedAssets,
            ip: remoteIp,
          });
          res.status(201).json({
            success: true,
            id: validator._id,
            token,
            verificationStatus: validator.username ? true : false,
            whitelisted: validator.whitelisted,
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

const generateFWBody = (body, wallet_address) => {
  const {
    name,
    email,
    username,
    assetType,
    socialLinks,
    address,
    bio,
    profileImage,
    bannerImage,
  } = body;

  return JSON.stringify({
    contact: {
      first_name: name,
      address: address.area ? address.area : "",
      country: address.country ? address.country : "",
      emails: email ? email : "",
      custom_field: {
        cf_wallet_address: wallet_address,
        cf_asset_type: assetType,
        cf_user_name: username,
        cf_profile_image: profileImage,
        cf_banner_image: bannerImage,
        cf_your_website: socialLinks.website ? socialLinks.website : "",
        cf_discord: socialLinks.discord ? socialLinks.discord : "",
        cf_twitter_handle: socialLinks.twitter ? socialLinks.twitter : "",
        cf_linkedin_handle: socialLinks.linkedin ? socialLinks.linkedin : "",
        cf_bio: bio,
      },
    },
  });
};

exports.onboardValidator = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
    const { wallet_address } = req.user;
    ValidatorModel.findOneAndUpdate(
      { wallet_address: wallet_address },
      { ...req.body },
      { new: true },
      async (err, docs) => {
        if (err) {
          res.status(400).json({ success: false });
        } else {
          let freshworkData = await fetch(
            `${process.env.FRESHWORK_URL}/crm/sales/api/contacts`,
            {
              method: "POST",
              body: generateFWBody(req.body, wallet_address),
              headers: {
                Authorization: `Token token=${process.env.FRESHWORK_API_TOKEN}`,
                "Content-Type": "application/json",
              },
            }
          );
          if (freshworkData) {
            await mixpanel.people(docs._id, {
              name: docs.name,
              username: docs.username,
              wallet_address: docs.wallet_address,
              role: docs.role,
              email: docs.email,
              ip: remoteIp,
            });
            await mixpanel.track("Validator onboard", {
              distinct_id: docs._id,
              name: docs.name,
              username: docs.username,
              wallet_address: docs.wallet_address,
              role: docs.role,
              email: docs.email,
              ip: remoteIp,
            });
            res.status(201).json({ success: true });
          } else {
            res.status(400).json({ success: false });
          }
        }
      }
    );
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.fetchAllValidators = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, search, category, location } = req.query;

    let queryStr = {
      whitelisted: true,
    };

    if (search) {
      queryStr = { ...queryStr, name: { $regex: search, $options: "i" } };
    }

    if (category) {
      queryStr = { ...queryStr, assetType: { $in: category.split(",") } };
    }

    if (location) {
      queryStr = { ...queryStr, "address.country": location };
    }

    query = ValidatorModel.find(queryStr)
      .select(
        "_id name username address profileImage bannerImage wallet_address"
      )
      .lean();

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
    const total = await ValidatorModel.countDocuments(queryStr);
    query = query.skip(startIndex).limit(limit);

    const results = await query;

    for (let i = 0; i < results.length; i++) {
      let data = await NftModel.find({
        validator: results[i]._id,
        validationState: "validated",
      }).select("validationAmount validationDuration");

      if (data) {
        let tv = 0,
          totalTime = 0;
        for (let j = 0; j < data.length; j++) {
          tv += data[j].validationAmount;
          totalTime += data[j].validationDuration;
        }
        results[i] = {
          ...results[i],
          totalAssets: data.length,
          totalValidation: data.length ? Math.round(tv / data.length) : 0,
          averageTime: data.length ? Math.round(totalTime / data.length) : 0,
        };
      }
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

exports.fetchValidators = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, search, category, location } = req.query;

    let queryStr = {
      whitelisted: true,
    };

    if (search) {
      queryStr = {
        ...queryStr,
        $or: [
          { name: { $regex: search, $options: "i" } },
          { username: { $regex: search, $options: "i" } },
        ],
      };
    }

    if (category) {
      queryStr = { ...queryStr, assetType: { $in: category.split(",") } };
    }

    if (location) {
      queryStr = { ...queryStr, "address.country": location };
    }

    query = ValidatorModel.find(queryStr)
      .select(
        "_id name username address profileImage bannerImage wallet_address"
      )
      .lean();

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
    const total = await ValidatorModel.countDocuments(queryStr);
    query = query.skip(startIndex).limit(limit);

    const results = await query;

    for (let i = 0; i < results.length; i++) {
      let data = await NftModel.find({
        validator: results[i]._id,
        validationState: "validated",
      }).select("validationAmount validationDuration");

      if (data) {
        let tv = 0,
          totalTime = 0;
        for (let j = 0; j < data.length; j++) {
          tv += data[j].validationAmount;
          totalTime += data[j].validationDuration;
        }
        results[i] = {
          ...results[i],
          totalAssets: data.length,
          totalValidation: data.length ? Math.round(tv / data.length) : 0,
          averageTime: data.length ? Math.round(totalTime / data.length) : 0,
        };
      }
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

exports.fetchValidatorlist = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby } = req.query;

    let queryStr = {};

    query = ValidatorModel.find(queryStr).select(validatorSelectQuery);

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
    const total = await ValidatorModel.countDocuments(queryStr);
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

exports.fetchValidatorById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    ValidatorModel.findById(id)
      .select(validatorSelectQuery)
      .lean()
      .exec(async (err, validator) => {
        if (err) {
          res.status(400).json({ success: false, data: {} });
        } else {
          if (validator) {
            let data = await NftModel.find({
              validator: validator._id,
              validationState: "validated",
            }).select("validationAmount validationDuration");

            if (data) {
              let tv = 0,
                totalTime = 0;
              for (let j = 0; j < data.length; j++) {
                tv += data[j].validationAmount;
                totalTime += data[j].validationDuration;
              }
              validator = {
                ...validator,
                totalAssets: data.length,
                totalValidation: data.length ? Math.round(tv / data.length) : 0,
                averageTime: data.length
                  ? Math.round(totalTime / data.length)
                  : 0,
              };
            } else {
              validator = {
                ...validator,
                totalAssets: 0,
                totalValidation: 0,
                averageTime: 0,
              };
            }
            res.status(200).json({ success: true, data: validator });
          } else {
            res.status(200).json({ success: true, data: validator });
          }
        }
      });
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.fetchValidatorByAddress = asyncHandler(async (req, res, next) => {
  try {
    const { wallet_address } = req.params;
    ValidatorModel.findOne({ wallet_address }, async (err, doc) => {
      if (err) {
        res.status(200).json({ success: false, data: {} });
      } else {
        if (!!doc) {
          let data = await NftModel.find({
            $or: [
              { validatorAddress: wallet_address },
              { nftOwnerType: "Validator" },
            ],
          }).select("_id validationState validationAmount");
          let validatedAssets = 0,
            tvl = 0;
          for (let i = 0; i < data.length; i++) {
            if (data[i].validationState === "validated") {
              validatedAssets += 1;
              tvl += data[i].validationAmount;
            }
          }
          res.status(200).json({
            success: true,
            data: { ...doc, totalAssets: data.length, validatedAssets, tvl },
          });
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

const generateFWUpsertBody = (body, v_email, wallet_address) => {
  const {
    name,
    username,
    assetType,
    socialLinks,
    bio,
    profileImage,
    bannerImage,
    email,
  } = body;

  return JSON.stringify({
    unique_identifier: {
      emails: v_email,
    },
    contact: {
      first_name: name,
      emails: email,
      custom_field: {
        cf_wallet_address: wallet_address,
        cf_asset_type: assetType,
        cf_user_name: username,
        cf_profile_image: profileImage,
        cf_banner_image: bannerImage,
        cf_your_website: socialLinks.website ? socialLinks.website : "",
        cf_discord: socialLinks.discord ? socialLinks.discord : "",
        cf_twitter_handle: socialLinks.twitter ? socialLinks.twitter : "",
        cf_linkedin_handle: socialLinks.linkedin ? socialLinks.linkedin : "",
        cf_bio: bio,
      },
    },
  });
};

exports.updateValidator = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
    const { wallet_address } = req.params;
    const { role } = req.user;
    ValidatorModel.findOneAndUpdate(
      { wallet_address },
      { ...req.body },
      null,
      async (err, doc) => {
        if (err) {
          res
            .status(400)
            .json({ success: false, message: "Profile failed to update" });
        } else {
          if (!!doc) {
            let freshworkData = await fetch(
              `${process.env.FRESHWORK_URL}/crm/sales/api/contacts/upsert`,
              {
                method: "POST",
                body: generateFWUpsertBody(req.body, doc.email, wallet_address),
                headers: {
                  Authorization: `Token token=${process.env.FRESHWORK_API_TOKEN}`,
                  "Content-Type": "application/json",
                },
              }
            );
            if (freshworkData) {
              await mixpanel.people(doc._id, {
                name: req.name,
                username: req.username,
                wallet_address,
                role,
                ip: remoteIp,
              });
              await mixpanel.track("Validator profile updated", {
                distinct_id: doc._id,
                name: req.name,
                username: req.username,
                wallet_address,
                role,
                ip: remoteIp,
              });
              res.status(201).json({
                success: true,
                message: "Profile successfully updated",
              });
            } else {
              res.status(400).json({ success: false });
            }
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
      requestState: "pending",
    };

    if (search) {
      queryStr = { ...queryStr, assetName: { $regex: search, $options: "i" } };
    }

    query = NFTValidationModel.find(queryStr)
      .populate([
        { path: "asset", select: "name mediaLinks assetType _id" },
        { path: "assetOwner", select: "name profileImage bannerImage _id" },
      ])
      .select("_id assetName asset assetOwner createdAt");

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
    const remoteIp = getRemoteIp(req);
    const { requestId } = req.params;
    const {
      validationType,
      validationAmount,
      validationDuration,
      validationRoyality,
      validationDocuments,
      validationCommission,
      contractAddress,
      collateral_percent,
    } = req.body;
    const { wallet_address, id } = req.user;
    const data = await NFTValidationModel.findById(requestId);
    if (data.validatorAddress === wallet_address) {
      if (data.requestState === "pending") {
        if (validationDocuments && validationDocuments.length) {
          NFTValidationModel.findOneAndUpdate(
            { _id: requestId },
            {
              validationType,
              validationAmount,
              validationDuration,
              validationRoyality,
              requestExpiresOn: addDays(new Date(), validationDuration),
              requestState: "validated",
              validationExpired: false,
              validationCommission,
              validationCount: 1,
              erc20ContractAddress: !!contractAddress ? contractAddress : "",
              fundBalance: validationAmount,
              $push: { validationDocuments: { $each: validationDocuments } },
            },
            async (err, doc) => {
              if (err) {
                res.status(401).json({ success: false });
              } else {
                if (!!doc) {
                  NftModel.findOneAndUpdate(
                    { _id: data.asset },
                    {
                      validator: id,
                      validatorAddress: wallet_address,
                      validationType,
                      validationAmount,
                      validationDuration,
                      validationRoyality,
                      requestExpiresOn: addDays(new Date(), validationDuration),
                      validationState: "validated",
                      validationExpired: false,
                      validationCommission,
                      validationDate: new Date(),
                      validationCount: 1,
                      erc20ContractAddress: !!contractAddress
                        ? contractAddress
                        : "",
                      fundBalance: validationAmount,
                      $push: {
                        history: {
                          action: "validated",
                          validator: id,
                        },
                        validationDocuments: { $each: validationDocuments },
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
                        if (activity) {
                          let notification = await NotificationModel.create({
                            nft: data.asset,
                            category: "asset-validation",
                            user: data.assetOwner,
                            validator: id,
                          });
                          if (notification) {
                            await mixpanel.track("Asset validated", {
                              distinct_id: id,
                              asset: data.asset,
                              validated_by: id,
                              validation_type: validationType,
                              collatoral_percentage: collateral_percent,
                              collateral_amount: validationAmount,
                              validation_duration: validationDuration,
                              validator_royality: validationRoyality,
                              one_time_commission: validationCommission,
                              asset_type: item.assetType[0],
                              asset_token: item.valueOfAsset.unit,
                              ip: remoteIp,
                            });
                            res.status(201).json({
                              success: true,
                              message: "Asset validated successfully",
                            });
                          }
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
              validationExpired: false,
              validationCommission,
              validationCount: 1,
              erc20ContractAddress: !!contractAddress ? contractAddress : "",
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
                      validator: id,
                      validatorAddress: wallet_address,
                      validationType,
                      validationAmount,
                      validationDuration,
                      validationRoyality,
                      validationDocuments,
                      requestExpiresOn: addDays(new Date(), validationDuration),
                      validationState: "validated",
                      validationExpired: false,
                      validationCommission,
                      validationDate: new Date(),
                      validationCount: 1,
                      erc20ContractAddress: !!contractAddress
                        ? contractAddress
                        : "",
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
                        if (activity) {
                          let notification = await NotificationModel.create({
                            nft: data.asset,
                            category: "asset-validation",
                            user: data.assetOwner,
                            validator: id,
                          });
                          if (notification) {
                            await mixpanel.track("Asset validated", {
                              distinct_id: id,
                              asset: data.asset,
                              validated_by: id,
                              validation_type: validationType,
                              collatoral_percentage: collateral_percent,
                              collateral_amount: validationAmount,
                              validation_duration: validationDuration,
                              validator_royality: validationRoyality,
                              one_time_commission: validationCommission,
                              asset_type: item.assetType[0],
                              asset_token: item.valueOfAsset.unit,
                              ip: remoteIp,
                            });
                            res.status(201).json({
                              success: true,
                              message: "Asset validated successfully",
                            });
                          }
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
        }
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
    const remoteIp = getRemoteIp(req);
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
                await mixpanel.track("Funding asset", {
                  distinct_id: id,
                  asset: data.asset,
                  ip: remoteIp,
                });
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
  try {
    const remoteIp = getRemoteIp(req);
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
      if (data.requestState === "pending") {
        if (validationDocuments) {
          NFTValidationModel.findOneAndUpdate(
            { _id: requestId },
            {
              validationType,
              validationAmount: data.validationAmount + validationAmount,
              validationDuration,
              validationRoyality,
              requestExpiresOn: addDays(new Date(), validationDuration),
              requestState: "validated",
              validationCount: data.validationCount + 1,
              validationExpired: false,
              fundBalance: data.fundBalance + validationAmount,
              $push: { validationDocuments: { $each: validationDocuments } },
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
                      validationAmount:
                        data.validationAmount + validationAmount,
                      validationDuration,
                      validationRoyality,
                      requestExpiresOn: addDays(new Date(), validationDuration),
                      validationState: "validated",
                      validationCount: data.validationCount + 1,
                      validationExpired: false,
                      validationDate: new Date(),
                      fundBalance: data.fundBalance + validationAmount,
                      $push: {
                        history: {
                          action: "revalidated asset",
                          validator: id,
                        },
                        validationDocuments: { $each: validationDocuments },
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
                          statusText: "Asset revalidated",
                        });
                        if (activity) {
                          await mixpanel.track("Asset revalidated", {
                            distinct_id: id,
                            asset: data.asset,
                            ip: remoteIp,
                          });
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
          NFTValidationModel.findOneAndUpdate(
            { _id: requestId },
            {
              validationType,
              validationAmount: data.validationAmount + validationAmount,
              validationDuration,
              validationRoyality,
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
                      validationAmount:
                        data.validationAmount + validationAmount,
                      validationDuration,
                      validationRoyality,
                      requestExpiresOn: addDays(new Date(), validationDuration),
                      validationState: "validated",
                      validationCount: data.validationCount + 1,
                      validationExpired: false,
                      validationDate: new Date(),
                      fundBalance: data.fundBalance + validationAmount,
                      $push: {
                        history: {
                          action: "revalidated asset",
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
                          statusText: "Asset revalidated",
                        });
                        if (activity) {
                          await mixpanel.track("Asset revalidated", {
                            distinct_id: id,
                            asset: data.asset,
                            ip: remoteIp,
                          });
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
        }
      } else {
        res.status(403).json({ success: false, message: "Forbidden Action" });
      }
    } else {
      res.status(403).json({ success: false, message: "Forbidden Action" });
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
      validatorAddress: req.user.wallet_address,
    };

    if (search) {
      queryStr = { ...queryStr, assetName: { $regex: search, $options: "i" } };
    }

    if (type) {
      queryStr = { ...queryStr, statusText: { $in: type.split(",") } };
    }

    query = ValidatorActivityModel.find(queryStr)
      .select("_id assetName validator statusText asset createdAt")
      .populate([
        { path: "asset", select: nftActivitySelectQuery },
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
    const remoteIp = getRemoteIp(req);
    const { requestId } = req.params;
    const { wallet_address, id } = req.user;
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
                validator: null,
                validatorAddress: null,
                validationId: null,
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
              let notification = await NotificationModel.create({
                nft: doc.asset,
                category: "asset-validation-reject",
                user: doc.assetOwner,
                validator: id,
              });
              if (notification) {
                await mixpanel.track("Reject validation request", {
                  distinct_id: id,
                  asset: doc.asset,
                  ip: remoteIp,
                });
                res.status(200).json({
                  success: true,
                  message: "Validation request rejected",
                });
              }
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

    const { sortby, search, type, blockchain, validation } = req.query;
    const { id } = req.params;

    let queryStr = {
      validator: id,
      validationState: "validated",
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

    query = NftModel.find(queryStr);

    query = query
      .populate([
        // {
        //   path: "nftCollection",
        //   select: collectionSelectQuery,
        // },
        { path: "nftOwner", select: "_id name profileImage" },
        // { path: "nftCreator", select: userSelectQuery },
        { path: "validator", select: "_id name profileImage" },
        // {
        //   path: "history.user",
        //   select: userHistorySelectQuery,
        // },
        // {
        //   path: "history.validator",
        //   select: validatorHistorySelectQuery,
        // },
      ])
      .select(
        "_id name validationState nftOwner nftOwnerType validator mediaLinks state listingPrice listingDate listingDuration"
      );

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
    const { sortby, search } = req.query;

    let queryStr = {
      validatorAddress: req.user.wallet_address,
      redeemRequest: "true",
    };

    if (search) {
      queryStr = { ...queryStr, name: { $regex: search, $options: "i" } };
    }

    query = NftModel.find(queryStr);

    query = query
      .populate([{ path: "nftOwner", select: userSelectQuery }])
      .select(redeemNftSelectQuery);

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
    const remoteIp = getRemoteIp(req);
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
            await mixpanel.track("Accept redeem request", {
              distinct_id: id,
              asset: assetId,
              redeem_amount: nftData.validationAmount,
              asset_type: nftData.assetType[0],
              ip: remoteIp,
            });
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
    const remoteIp = getRemoteIp(req);
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
            await mixpanel.track("Cancel redeem request", {
              distinct_id: id,
              asset: assetId,
              ip: remoteIp,
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

exports.addNFTtoFavourite = asyncHandler(async (req, res, next) => {
  try {
    const { wallet_address } = req.user;
    const { id } = req.body;

    const favouriteNfts = await ValidatorModel.findOne({
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

    const nft = await ValidatorModel.findOneAndUpdate(
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
    const nfts = await ValidatorModel.findOne({ _id: id }).populate(
      "favouriteNFT"
    );
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

exports.whitelistRequest = asyncHandler(async (req, res, next) => {
  try {
    ValidatorModel.findOneAndUpdate(
      { wallet_address: req.params.wallet_address },
      { whitelisted: true },
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

exports.blacklistRequest = asyncHandler(async (req, res, next) => {
  try {
    ValidatorModel.findOneAndUpdate(
      { wallet_address: req.params.wallet_address },
      { whitelisted: false },
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

exports.fetchBurnedNfts = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, search, type, blockchain } = req.query;
    const { id } = req.user;

    let queryStr = {
      nftOwner: id,
      nftOwnerType: "Validator",
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
      .select(
        "_id name validationState nftOwner nftOwnerType validator mediaLinks state listingPrice listingDate listingDuration"
      )
      .populate([
        // {
        //   path: "nftCollection",
        //   select: collectionSelectQuery,
        // },
        { path: "nftOwner", select: "_id name profileImage" },
        // { path: "nftCreator", select: userSelectQuery },
        { path: "validator", select: "_id name profileImage" },
        // {
        //   path: "history.user",
        //   select: userHistorySelectQuery,
        // },
        // {
        //   path: "history.validator",
        //   select: validatorHistorySelectQuery,
        // },
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
