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
const { getRemoteIp, Role } = require("../utils/utils");
const FormData = require("form-data");

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

const generateFWBody = (doc, wallet_address) => {
  let formdata = new FormData();
  const { name, username, email, assetType, socialLinks, bio } = doc;
  formdata.append("SingleLine", name);
  formdata.append("SingleLine1", username);
  formdata.append("Checkbox", JSON.stringify(assetType));
  formdata.append("Email", email);
  formdata.append("SingleLine2", wallet_address);

  if (bio.length) {
    formdata.append("MultiLine", bio);
  }

  if (socialLinks.website) {
    formdata.append("Website", socialLinks.website);
  }
  if (socialLinks.twitter) {
    formdata.append("Website1", socialLinks.twitter);
  }
  if (socialLinks.discord) {
    formdata.append("Website2", socialLinks.discord);
  }
  if (socialLinks.linkedin) {
    formdata.append("Website3", socialLinks.linkedin);
  }

  return formdata;
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
          res.status(400).json({ err, success: false });
        } else {
          let zohoData = await fetch(
            "https://forms.zohopublic.in/aconomy/form/ValidatorLogin1/formperma/XXwzW8UW3rdMNFs1xgk-6zD615SQp-iS444BVJwf7k8/htmlRecords/submit",
            {
              method: "POST",
              body: generateFWBody(docs, wallet_address),
            }
          );
          if (zohoData && zohoData.status === 200) {
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
            res.status(400).json({ err: zohoData, success: false });
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
        "_id name username address profileImage bannerImage wallet_address kybEventType whitelisted"
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
      totalCount: total,
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
      totalCount: total,
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

    query = ValidatorModel.find(queryStr).select("-signatureMessage -__v");

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

// exports.fetchValidatorById = asyncHandler(async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     ValidatorModel.findById(id)
//       .select(validatorSelectQuery)
//       .lean()
//       .exec(async (err, validator) => {
//         if (err) {
//           res.status(400).json({ success: false, data: {} });
//         } else {
//           if (validator) {
//             let data = await NftModel.find({
//               validator: validator._id,
//               validationState: "validated",
//             }).select("validationAmount validationDuration");

//             if (data) {
//               let tv = 0,
//                 totalTime = 0;
//               for (let j = 0; j < data.length; j++) {
//                 tv += data[j].validationAmount;
//                 totalTime += data[j].validationDuration;
//               }
//               validator = {
//                 ...validator,
//                 totalAssets: data.length,
//                 totalValidation: data.length ? Math.round(tv / data.length) : 0,
//                 averageTime: data.length
//                   ? Math.round(totalTime / data.length)
//                   : 0,
//               };
//             } else {
//               validator = {
//                 ...validator,
//                 totalAssets: 0,
//                 totalValidation: 0,
//                 averageTime: 0,
//               };
//             }
//             res.status(200).json({ success: true, data: validator });
//           } else {
//             res.status(200).json({ success: true, data: validator });
//           }
//         }
//       });
//   } catch (err) {
//     res.status(400).json({ success: false });
//   }
// });

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
              // validator: validator._id,
              // validationState: "validated",
              $or: [
                { validatorAddress: validator.wallet_address },
                { nftOwnerType: "Validator" },
              ],
            }).select("validationAmount validationDuration validationState");

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
              data: {
                ...validator,
                totalAssets: data.length,
                validatedAssets,
                tvl,
              },
            });
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

const generateFWUpsertBody = (body, wallet_address) => {
  let formdata = new FormData();
  const { name, username, email, assetType, socialLinks, bio } = body;
  formdata.append("SingleLine", name);
  formdata.append("SingleLine1", username);
  formdata.append("Checkbox", JSON.stringify(assetType));
  formdata.append("Email", email);
  formdata.append("SingleLine2", wallet_address);

  if (bio.length) {
    formdata.append("MultiLine", bio);
  }

  if (socialLinks.website) {
    formdata.append("Website", socialLinks.website);
  }
  if (socialLinks.twitter) {
    formdata.append("Website1", socialLinks.twitter);
  }
  if (socialLinks.discord) {
    formdata.append("Website2", socialLinks.discord);
  }
  if (socialLinks.linkedin) {
    formdata.append("Website3", socialLinks.linkedin);
  }

  return formdata;
};

exports.updateValidator = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
    const { wallet_address } = req.params;
    const { role } = req.user;
    ValidatorModel.findOneAndUpdate(
      { wallet_address },
      { ...req.body },
      // null,
      { new: true },
      async (err, doc) => {
        if (err) {
          res
            .status(400)
            .json({ success: false, err, message: "Profile failed to update" });
        } else {
          if (!!doc) {
            let zohoData = await fetch(
              "https://forms.zohopublic.in/aconomy/form/ValidatorLogin1/formperma/XXwzW8UW3rdMNFs1xgk-6zD615SQp-iS444BVJwf7k8/htmlRecords/submit",
              {
                method: "POST",
                body: generateFWUpsertBody(doc, wallet_address),
              }
            );

            if (zohoData && zohoData.status === 200) {
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
              res.status(400).json({ err: zohoData, success: false });
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

exports.updateValidatorIntro = asyncHandler(async (req, res, next) => {
  try {
    const { wallet_address } = req.params;
    const { hideIntro, hideLearnBasics } = req.body;
    ValidatorModel.findOneAndUpdate(
      { wallet_address },
      {
        hideIntro,
        hideLearnBasics,
      },
      // null,
      { new: true },
      async (err, doc) => {
        if (err) {
          res
            .status(400)
            .json({ success: false, err, message: "Section failed to hide" });
        } else {
          if (!!doc) {
            res.status(201).json({
              success: true,
              message: "Sections successfully hidden",
            });
          } else {
            res
              .status(400)
              .json({ success: false, message: "Wrong wallet address" });
          }
        }
      }
    );
  } catch (err) {
    res.status(400).json({ success: false, message: "Section failed to hide" });
  }
});

exports.scheduleMeeting = asyncHandler(async (req, res, next) => {
  try {
    const { wallet_address } = req.user;
    ValidatorModel.findOneAndUpdate(
      { wallet_address },
      { ...req.body },
      null,
      async (err, doc) => {
        if (err) {
          res
            .status(400)
            .json({ success: false, message: "Failed to schedule a meeting" });
        } else {
          if (!!doc) {
            res.status(201).json({
              success: true,
              message: "Meeting successfully scheduled",
            });
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
      .json({ success: false, message: "Failed to schedule a meeting" });
  }
});

exports.fetchAllValidationRequest = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, search } = req.query;

    let queryStr = {
      validatorAddress: req.user.wallet_address,
      requestState: "pending",
      assetOwnerAddress: { $ne: req.user.wallet_address },
    };

    if (search) {
      queryStr = { ...queryStr, assetName: { $regex: search, $options: "i" } };
    }

    query = NFTValidationModel.find(queryStr)
      .populate([
        { path: "asset", select: "name mediaLinks assetType _id" },
        { path: "assetOwner", select: "name profileImage bannerImage _id" },
      ])
      .select("_id assetName asset assetOwner createdAt updatedAt");

    if (sortby) {
      const sortBy = sortby.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-updatedAt");
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
      totalCount: total,
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

exports.fetchAllValidationRequestDashboard = asyncHandler(
  async (req, res, next) => {
    try {
      let query;

      const { sortby, search } = req.query;

      let queryStr = {
        validatorAddress: req.user.wallet_address,
        requestState: "pending",
      };

      if (search) {
        queryStr = {
          ...queryStr,
          assetName: { $regex: search, $options: "i" },
        };
      }

      query = NFTValidationModel.find(queryStr)
        .populate([
          { path: "asset", select: "name mediaLinks assetType _id" },
          { path: "assetOwner", select: "name profileImage bannerImage _id" },
        ])
        .select("_id assetName asset assetOwner createdAt updatedAt");

      if (sortby) {
        const sortBy = sortby.split(",").join(" ");
        query = query.sort(sortBy);
      } else {
        query = query.sort("-updatedAt");
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
        totalCount: total,
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
  }
);

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
      proposedValueOfAsset,
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
                      proposedValueOfAsset,
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
                            if (
                              data.assetOwnerAddress !== data.validatorAddress
                            ) {
                              let ownerData = await UserModel.findOneAndUpdate(
                                {
                                  wallet_address: data.assetOwnerAddress,
                                },
                                { $inc: { tvl: validationAmount } }
                              );
                              if (ownerData) {
                                res.status(201).json({
                                  success: true,
                                  message: "Asset validated successfully",
                                });
                              } else {
                                res.status(401).json({
                                  success: false,
                                  message: "Asset owner tvl not updated",
                                });
                              }
                            } else {
                              res.status(201).json({
                                success: true,
                                message: "Asset validated successfully",
                              });
                            }
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
              validationDuration: validationDuration,
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
                      proposedValueOfAsset,
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
                            if (
                              data.assetOwnerAddress !== data.validatorAddress
                            ) {
                              let ownerData = await UserModel.findOneAndUpdate(
                                {
                                  wallet_address: data.assetOwnerAddress,
                                },
                                { $inc: { tvl: validationAmount } }
                              );
                              if (ownerData) {
                                res.status(201).json({
                                  success: true,
                                  message: "Asset validated successfully",
                                });
                              } else {
                                res.status(401).json({
                                  success: false,
                                  message: "Asset owner tvl not updated",
                                });
                              }
                            } else {
                              res.status(201).json({
                                success: true,
                                message: "Asset validated successfully",
                              });
                            }
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
                  $push: {
                    history: {
                      action: "Added more funds",
                      validator: id,
                      amount,
                    },
                  },
                }
              );
              // let activity = await ValidatorActivityModel.create({
              //   validatorAddress: wallet_address,
              //   validator: id,
              //   asset: data.asset,
              //   assetOwner: data.assetOwnerAddress,
              //   assetName: data.assetName,
              //   statusText: "Added more funds",
              // });
              // if (activity) {
              if (nftData) {
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
              // }
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
      proposedValueOfAsset,
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
              validationDuration: validationDuration,
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
                      validationDuration: validationDuration,
                      validationRoyality,
                      requestExpiresOn: addDays(new Date(), validationDuration),
                      validationState: "validated",
                      validationCount: data.validationCount + 1,
                      proposedValueOfAsset,
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
                          let ownerData = await UserModel.findOneAndUpdate(
                            {
                              wallet_address: data.assetOwnerAddress,
                            },
                            {
                              $inc: {
                                tvl: data.validationAmount + validationAmount,
                              },
                            }
                          );
                          if (ownerData) {
                            res.status(201).json({
                              success: true,
                              message: "Asset revalidated successfully",
                            });
                          } else {
                            res.status(401).json({
                              success: false,
                              message: "Asset owner tvl not updated",
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
              validationAmount: data.validationAmount + validationAmount,
              validationDuration: validationDuration,
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
                      proposedValueOfAsset,
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
                          let ownerData = await UserModel.findOneAndUpdate(
                            {
                              wallet_address: data.assetOwnerAddress,
                            },
                            {
                              $inc: {
                                tvl: data.validationAmount + validationAmount,
                              },
                            }
                          );
                          if (ownerData) {
                            res.status(201).json({
                              success: true,
                              message: "Asset revalidated successfully",
                            });
                          } else {
                            res.status(401).json({
                              success: false,
                              message: "Asset owner tvl not updated",
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
        // { path: "asset", select: nftActivitySelectQuery },
        { path: "validator", select: validatorSelectQuery },
        {
          path: "asset",
          select: nftActivitySelectQuery,
          populate: {
            path: "nftOwner",
            model: "User",
            select: "name",
          },
        },
        {
          path: "asset",
          select: nftActivitySelectQuery,
          populate: {
            path: "previousOwner",
            model: "User",
            select: "name",
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
      totalCount: total,
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
    let nftValidationData = await NFTValidationModel.findOne({
      _id: requestId,
    });
    if (nftValidationData) {
      if (
        nftValidationData.requestState === "unvalidated" &&
        nftValidationData.validationExpired
      ) {
        NFTValidationModel.findOneAndUpdate(
          { _id: requestId },
          { requestState: "unvalidated" },
          null,
          async (err, doc) => {
            if (err) {
              res.status(200).json({ success: false, data: {} });
            } else {
              if (!!doc) {
                let nftData = await NftModel.findOneAndUpdate(
                  { _id: doc.asset },
                  {
                    // validator: null,
                    // validatorAddress: null,
                    // validationId: null,
                    validationState: "unvalidated",
                  }
                );
                // let activity = await UserActivityModel.create({
                //   userAddress: doc.assetOwnerAddress,
                //   user: doc.assetOwner,
                //   asset: doc.asset,
                //   assetName: doc.assetName,
                //   statusText: `Validation request rejected by validator ${wallet_address}`,
                // });
                // if (activity) {
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
                // }
              } else {
                res.status(400).json({
                  success: false,
                  message: "Wrong inputs",
                });
              }
            }
          }
        );
      } else {
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
                    // validator: null,
                    // validatorAddress: null,
                    // validationId: null,
                    validationState: "unvalidated",
                  }
                );
                // let activity = await UserActivityModel.create({
                //   userAddress: doc.assetOwnerAddress,
                //   user: doc.assetOwner,
                //   asset: doc.asset,
                //   assetName: doc.assetName,
                //   statusText: `Validation request rejected by validator ${wallet_address}`,
                // });
                // if (activity) {
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
                // }
              } else {
                res.status(400).json({
                  success: false,
                  message: "Wrong inputs",
                });
              }
            }
          }
        );
      }
    } else {
      res.status(400).json({ success: false });
    }
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
        { path: "nftOwner", select: "_id name profileImage kycEventType" },
        // { path: "nftCreator", select: userSelectQuery },
        {
          path: "validator",
          select: "_id name profileImage kybEventType whitelisted",
        },
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
        "_id name validationState nftOwner nftOwnerType validator mediaLinks state listingPrice listingDate listingDuration lendBorrowOffer"
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
      totalCount: total,
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
      totalCount: total,
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
      if (data.validationState === "validated" || data.validationExpired) {
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
      if (data.validationState === "validated" || data.validationExpired) {
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
        { path: "nftOwner", select: "_id name profileImage kycEventType" },
        // { path: "nftCreator", select: userSelectQuery },
        {
          path: "validator",
          select: "_id name profileImage kybEventType whitelisted",
        },
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
      totalCount: total,
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

exports.checkEmailAvailability = asyncHandler(async (req, res, next) => {
  try {
    const { email } = req.body;
    if (email === "") {
      res.status(200).json({ success: false, message: "Invalid email" });
    } else {
      ValidatorModel.findOne({ email }, (err, validatorData) => {
        if (err) {
          res.status(400).json({ success: false });
        } else {
          if (validatorData) {
            res.status(200).json({ success: false, message: "Email is taken" });
          } else {
            res
              .status(200)
              .json({ success: true, message: "Email is available" });
          }
        }
      });
    }
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.mintAndValidateNFT = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
    const { id, wallet_address, role } = req.user;
    const {
      validationType,
      validationAmount,
      validationDuration,
      validationRoyality,
      validationDocuments,
      validationCommission,
      contractAddress,
      collateral_percent,
      proposedValueOfAsset,
    } = req.body;
    NftModel.create(
      {
        ...req.body,
        nftOwner: id,
        nftOwnerType: Role[role],
        nftOwnerAddress: wallet_address,
        nftCreator: id,
        nftCreatorType: Role[role],
        nftCreatorAddress: wallet_address,
        validationState: "pending",
        validator: id,
        validatorAddress: wallet_address,
        validationDuration,
        history: [
          {
            action: "Created",
            validator: id,
          },
        ],
      },
      async (err, docData) => {
        if (err) {
          res.status(401).json({ success: false });
        } else {
          if (!!docData) {
            let validationData = await NFTValidationModel.create({
              asset: docData._id,
              validator: id,
              validatorAddress: wallet_address,
              assetOwnerAddress: wallet_address,
              assetOwner: id,
              assetName: docData.name,
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
            });
            if (validationData) {
              NftModel.findOneAndUpdate(
                { _id: validationData.asset },
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
                  proposedValueOfAsset,
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
                      asset: validationData.asset,
                      assetOwner: validationData.assetOwnerAddress,
                      assetName: validationData.assetName,
                      statusText: "Asset validated",
                    });
                    if (activity) {
                      await mixpanel.track("Asset validated", {
                        distinct_id: id,
                        asset: validationData.asset,
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
                        _id: validationData.asset,
                        message: "Asset minted & validated successfully",
                      });
                    }
                  } else {
                    res.status(401).json({ success: false });
                  }
                }
              );
            } else {
              res.status(400).json({
                success: false,
                message: "Validation data creation failed",
              });
            }
          } else {
            res
              .status(400)
              .json({ success: false, message: "Failed to create NFT" });
          }
        }
      }
    );
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.mintNFT = asyncHandler(async (req, res, next) => {
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
        validationState: "pending",
        validator: id,
        validatorAddress: wallet_address,
        history: [
          {
            action: "Created",
            validator: id,
          },
        ],
      },
      async (err, docData) => {
        if (err) {
          res.status(401).json({ success: false });
        } else {
          if (!!docData) {
            let validationData = await NFTValidationModel.create({
              asset: docData._id,
              validator: id,
              validatorAddress: wallet_address,
              assetOwnerAddress: wallet_address,
              assetOwner: id,
              assetName: docData.name,
              requestState: "pending",
            });
            if (validationData) {
              let data = await NftModel.findOneAndUpdate(
                { _id: docData._id },
                { validationId: validationData._id }
              );
              res.status(201).json({
                success: true,
                _id: validationData.asset,
                requestId: validationData._id,
                message: "Asset minted successfully",
              });
            } else {
              res.status(400).json({
                success: false,
                message: "Validation data creation failed",
              });
            }
          } else {
            res
              .status(400)
              .json({ success: false, message: "Failed to create NFT" });
          }
        }
      }
    );
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.dashboard = asyncHandler(async (req, res, next) => {
  try {
    const { wallet_address, id, hideIntro, hideLearnBasics } = req.user;
    let dataObj = {};
    const validationRequestCount = await NFTValidationModel.countDocuments({
      validatorAddress: wallet_address,
      requestState: "pending",
    });
    let data = await NftModel.find({
      validator: id,
      validationState: "validated",
    }).select("validationAmount validationDuration");

    let redeemRequestCount = await NftModel.countDocuments({
      validatorAddress: wallet_address,
      redeemRequest: "true",
    });

    if (data) {
      let tv = 0,
        totalTime = 0;
      for (let j = 0; j < data.length; j++) {
        tv += data[j].validationAmount;
        totalTime += data[j].validationDuration;
      }

      let validationRequests = await NFTValidationModel.find({
        validatorAddress: wallet_address,
        requestState: "pending",
      })
        .limit(10)
        .populate([
          { path: "assetOwner", select: "_id username" },
          { path: "asset", select: "_id assetType" },
        ])
        .select("assetName assetOwner asset updatedAt");

      let redeemRequests = await NftModel.find({
        validatorAddress: wallet_address,
        redeemRequest: "true",
      })
        .limit(10)
        .populate([{ path: "nftOwner", select: "_id username" }])
        .select("name nftOwner nftOwnerType assetType updatedAt");

      let arr = [...validationRequests, ...redeemRequests];

      arr.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      dataObj = {
        tvl: data.length ? Math.round(tv / data.length) : 0,
        pinft: data.length,
        validationRequest: validationRequestCount,
        redeemRequest: redeemRequestCount,
        recentRequest: arr,
        hideIntro,
        hideLearnBasics,
      };
    }
    res.status(200).json({
      success: true,
      data: dataObj,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
    });
  }
});
