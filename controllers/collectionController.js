const CollectionModel = require("../models/Collection");
const NftModel = require("../models/NFT");
const asyncHandler = require("../middlewares/async");
const {
  collectionSelectQuery,
  nftSelectQuery,
} = require("../utils/selectQuery");

exports.fetchCollections = asyncHandler(async (req, res, next) => {
  try {
    res.status(200).json(res.advancedResults);
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.fetchCollection = asyncHandler(async (req, res, next) => {
  try {
    const { collectionId } = req.params;
    if (!!collectionId) {
      CollectionModel.findOne({ _id: collectionId }, (err, doc) => {
        if (err) {
          res.status(400).json({ success: false, data: {} });
        } else {
          res.status(200).json({ success: true, data: doc });
        }
      }).select(collectionSelectQuery);
    } else {
      res.status(400).json({ success: false });
    }
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.createCollection = asyncHandler(async (req, res, next) => {
  try {
    CollectionModel.create(
      {
        ...req.body,
        collectionOwner: req.user.id,
        collectionOwnerAddress: req.user.wallet_address,
      },
      (err, doc) => {
        if (err) {
          res.status(401).json({ success: false });
        } else {
          if (!!doc) {
            res.status(201).json({
              success: true,
              message: "Collection successfully created",
            });
          } else {
            res
              .status(401)
              .json({ success: false, message: "Failed to create collection" });
          }
        }
      }
    );
  } catch (err) {
    res
      .status(401)
      .json({ success: false, message: "Failed to create collection" });
  }
});

exports.fetchAllCollectionNfts = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby } = req.query;

    let queryStr = {
      // blockchain: req.query.blockchain,
      nftCollection: req.params.collectionId,
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
    });
  }
});
