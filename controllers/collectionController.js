const CollectionModel = require("../models/Collection");
const NftModel = require("../models/NFT");
const UserActivityModel = require("../models/UserActivity");
const asyncHandler = require("../middlewares/async");
const {
  collectionSelectQuery,
  nftSelectQuery,
} = require("../utils/selectQuery");

exports.fetchCollections = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, search, category } = req.query;

    let queryStr = {};

    if (search) {
      queryStr = { ...queryStr, name: { $regex: search, $options: "i" } };
    }

    if (category) {
      queryStr = { ...queryStr, assetType: { $all: category.split(",") } };
    }

    query = CollectionModel.find(queryStr).select(collectionSelectQuery);

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
    const total = await CollectionModel.countDocuments(queryStr);
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

exports.fetchCollection = asyncHandler(async (req, res, next) => {
  try {
    const { collectionId } = req.params;
    if (!!collectionId) {
      CollectionModel.findOne({ _id: collectionId }, async (err, doc) => {
        if (err) {
          res.status(400).json({ success: false, data: {} });
        } else {
          // res.status(200).json({ success: true, data: doc });
          let data = await NftModel.find({
            nftCollection: collectionId,
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
          for (let i = 0; i < data.length; i++) {
            if (data.validationState === "validated") {
              tvl += data[i].validationAmount;
            }
            if (data[i].state === "sale" || data[i].state === "auction") {
              listed += 1;
            }
            owners.push({
              name: data[i].nftOwner.name,
              wallet_address: data[i].nftOwner.wallet_address,
            });
          }
          let dataObj = {
            ...doc._doc,
            tvl,
            listed: data.length ? Math.round((listed / data.length) * 100) : 0,
            totalAssets: data.length,
            owners: [
              ...new Map(
                owners.map((item) => [item["wallet_address"], item])
              ).values(),
            ],
          };
          res.status(200).json({ success: true, data: dataObj });
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
    const { wallet_address, id } = req.user;
    CollectionModel.create(
      {
        ...req.body,
        collectionOwner: id,
        collectionOwnerAddress: wallet_address,
      },
      async (err, doc) => {
        if (err) {
          res.status(401).json({ success: false });
        } else {
          if (!!doc) {
            let activity = await UserActivityModel.create({
              userAddress: wallet_address,
              user: id,
              assetCollection: doc._id,
              statusText: "Collection created",
            });
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

exports.fetchPublicCollections = asyncHandler(async (req, res, next) => {
  try {
    const { blockchain } = req.body;
    let query;

    let queryStr = {
      $and: [{ isPublic: true }, { blockchain }],
    };

    query = CollectionModel.find(queryStr);

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await CollectionModel.countDocuments(queryStr);
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
      hello: "world",
    });
  }
});

exports.fetchCollectionActivities = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby } = req.query;

    let queryStr = {
      // blockchain: req.query.blockchain,
      assetCollection: req.params.collectionId,
    };

    query = UserActivityModel.find(queryStr).populate([
      { path: "asset", select: "_id name mediaLinks assetType" },
      { path: "user", select: "_id name profileImage" },
      { path: "assetCollection", select: "_id name profileImage" },
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
