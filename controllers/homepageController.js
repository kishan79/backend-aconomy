const NftModel = require("../models/NFT");
const ValidatorModel = require("../models/Validator");
const PoolModel = require("../models/Pool");
const OfferModel = require("../models/Offer");
const asyncHandler = require("../middlewares/async");
const {
  nftSelectQuery,
  collectionSelectQuery,
  userSelectQuery,
  validatorSelectQuery,
  userHistorySelectQuery,
  validatorHistorySelectQuery,
  poolSelectQuery,
} = require("../utils/selectQuery");
const { Role } = require("../utils/utils");

exports.getLatestNfts = asyncHandler(async (req, res, next) => {
  try {
    let query;

    let queryStr = {
      state: "sale",
    };

    query = NftModel.find(queryStr)
      .populate([
        { path: "nftOwner", select: "name profileImage" },
        { path: "validator", select: "name profileImage" },
      ])
      .select("name nftOwner nftOwnerType mediaLinks validator listingPrice");

    query = query.sort("-createdAt").limit(4);

    const results = await query;

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

exports.getTopValidators = asyncHandler(async (req, res, next) => {
  try {
    let query;

    let queryStr = {
      whitelisted: true,
    };

    query = ValidatorModel.find(queryStr)
      .select("name username address profileImage bannerImage")
      .lean();

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

    results.sort((a, b) => b.totalValidation - a.totalValidation);
    data = results.splice(0, 3);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
      message: "Failed to execute"
    });
  }
});

exports.getLatestPools = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, verification } = req.query;

    let queryStr = {
      // is_verified: verification === "verified" ? true : false,
      visibility: "public",
    };

    query = PoolModel.find(queryStr).select("name type duration apr_percent");

    query = query.sort("-createdAt").limit(4);

    const results = await query.lean();

    for (let i = 0; i < results.length; i++) {
      let activeLoanData = await OfferModel.find({
        pool: results[i]._id,
        status: "accepted",
      }).select("amount");
      if (activeLoanData) {
        let activeLoans = 0;
        for (let j = 0; j < activeLoanData.length; j++) {
          activeLoans += activeLoanData[j].amount;
        }
        results[i] = {
          ...results[i],
          activeLoans,
        };
      }
    }

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
      message: "Failed to execute"
    });
  }
});

exports.getFeaturedAssetClass = asyncHandler(async (req, res, next) => {
  try {
    const ASSET_TYPES = [
      "Art",
      "Books",
      "Collectibles",
      "Fossils & Minerals",
      "Handbags",
      "Jewellery",
      "Sculptures",
      "Sneakers",
      "Watches",
    ];
    let dataObj = {};
    for (let i = 0; i < ASSET_TYPES.length; i++) {
      let data = await NftModel.find({
        state: "sale",
        assetType: ASSET_TYPES[i],
      })
        .select("name nftOwner nftOwnerType mediaLinks validator listingPrice")
        .sort("-createdAt")
        .limit(3);
      dataObj[ASSET_TYPES[i]] = data;
    }
    return res.status(200).json({
      success: true,
      data: dataObj,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
      message: "Failed to execute"
    });
  }
});
