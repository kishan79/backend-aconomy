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
              expiresIn: 60 * 60,
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

exports.fetchValidatorByAddress = asyncHandler(async (req, res, next) => {
  try {
    const { wallet_address } = req.params;
    ValidatorModel.findOne({ wallet_address }, (err, doc) => {
      if (err) {
        res.status(400).json({ success: false, data: {} });
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
    }).select("-signatureMessage -__v -createdAt -updatedAt");
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
      assetName: { $regex: search, $options: "i" },
    };

    query = NFTValidationModel.find(queryStr);

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
    } = req.body;
    const { wallet_address, id } = req.user;
    const data = await NFTValidationModel.findById(requestId);
    if (data.validatorAddress === wallet_address) {
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
                      res.status(201).json({
                        success: true,
                        message: "Asset validated successfully",
                      });
                    }
                  } else {
                    res.status(401).json({success: false});
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
  } catch (err) {
    res.status(401).json({ success: false, err });
  }
});
