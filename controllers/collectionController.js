const CollectionModel = require("../models/Collection");
const asyncHandler = require("../middlewares/async");

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
      }).select("-createdAt -updatedAt -__v");
    } else {
      res.status(400).json({success: false});
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
        collectionOwnerId: req.user.id,
        collectionOwnerAddress: req.user.wallet_address,
      },
      (err, docs) => {
        if (err) {
          res.status(400).json({ success: false });
        } else {
          res.status(201).json({
            success: true,
            message: "Collection successfully created",
          });
        }
      }
    );
  } catch (err) {
    res
      .status(401)
      .json({ success: false, message: "Failed to create collection" });
  }
});
