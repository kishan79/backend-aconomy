const NftModel = require("../models/NFT");
const ValidatorModel = require("../models/Validator");
const PoolModel = require("../models/Pool");
const OfferModel = require("../models/Offer");
const CollectionModel = require("../models/Collection");
const asyncHandler = require("../middlewares/async");
const mixpanel = require("../services/mixpanel");
const { getRemoteIp } = require("../utils/utils");
const fetch = require("node-fetch");

exports.getCarouselData = asyncHandler(async (req, res, next) => {
  try {
    let auctionData = await NftModel.find({ state: "auction" })
      .sort({ createdAt: -1 })
      .limit(1)
      .populate([
        { path: "nftOwner", select: "name profileImage" },
        { path: "validator", select: "name profileImage" },
      ])
      .select("name nftOwner nftOwnerType mediaLinks validator listingPrice validationState");
    let collectionData = await CollectionModel.find()
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();
    if (collectionData.length) {
      let data = await NftModel.find({
        nftCollection: collectionData[0]._id,
      })
        .select(
          "_id validationAmount validationState state nftOwner nftOwnerType nftOwnerAddress tokenId"
        )
        .lean();
      let tvl = 0;
      for (let i = 0; i < data.length; i++) {
        if (data.validationState === "validated") {
          tvl += data[i].validationAmount;
        }
      }
      collectionData[0] = [
        { ...collectionData[0], tvl, totalAssets: data.length },
      ];
    }
    let validatorData = await ValidatorModel.find({ whitelisted: true })
      .select("name username address profileImage bannerImage bio")
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();

    if (validatorData.length) {
      let data = await NftModel.find({
        validator: validatorData[0]._id,
        validationState: "validated",
      }).select("validationAmount validationDuration");

      if (data.length) {
        let tv = 0,
          totalTime = 0;
        for (let j = 0; j < data.length; j++) {
          tv += data[j].validationAmount;
          totalTime += data[j].validationDuration;
        }
        validatorData[0] = {
          ...validatorData[0],
          totalAssets: data.length,
          totalValidation: data.length ? Math.round(tv / data.length) : 0,
        };
      } else {
        validatorData[0] = {
          ...validatorData[0],
          totalAssets: data.length,
          totalValidation: data.length ? Math.round(tv / data.length) : 0,
          averageTime: data.length ? Math.round(totalTime / data.length) : 0,
        };
      }
      res.status(200).json({
        data: {
          auction: auctionData.length ? auctionData[0] : {},
          collection: collectionData.length ? collectionData[0] : {},
          validator: validatorData.length ? validatorData[0] : {},
        },
      });
    } else {
      res.status(200).json({
        data: {
          auction: auctionData.length ? auctionData[0] : {},
          collection: collectionData.length ? collectionData[0] : {},
          validator: validatorData.length ? validatorData[0] : {},
        },
      });
    }
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
      message: "Failed to execute",
    });
  }
});

exports.getLatestNfts = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
    let query;

    let queryStr = {
      state: "sale",
    };

    query = NftModel.find(queryStr)
      .populate([
        { path: "nftOwner", select: "name profileImage" },
        { path: "validator", select: "name profileImage" },
      ])
      .select(
        "name nftOwner nftOwnerType mediaLinks validator listingPrice state validationState"
      );

    query = query.sort("-createdAt").limit(12);

    const results = await query;

    await mixpanel.track("Homepage viewed", {
      ip: remoteIp,
    });

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
    data = results.splice(0, 11);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
      message: "Failed to execute",
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

    query = query.sort("-createdAt").limit(12);

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
      message: "Failed to execute",
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
        .populate([
          { path: "nftOwner", select: "name profileImage" },
          { path: "validator", select: "name profileImage" },
        ])
        .select(
          "name nftOwner nftOwnerType mediaLinks validator listingPrice state validationState"
        )
        .sort("-createdAt")
        .limit(12);
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
      message: "Failed to execute",
    });
  }
});

exports.newsLetter = asyncHandler(async (req, res, next) => {
  try {
    let freshworkData = await fetch(
      `${process.env.FRESHWORK_URL}/crm/sales/api/contacts`,
      {
        method: "POST",
        body: JSON.stringify({ contact: { emails: req.body.email } }),
        headers: {
          Authorization: `Token token=${process.env.FRESHWORK_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (freshworkData.status === 200) {
      res.status(201).json({ success: true });
    } else {
      res.status(400).json({ success: false });
    }
  } catch (err) {
    res.status(400).json({ success: false });
  }
});