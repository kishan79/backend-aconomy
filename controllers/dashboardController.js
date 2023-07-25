const NftModel = require("../models/NFT");
const UserModel = require("../models/User");
const ValidatorModel = require("../models/Validator");
const PoolModel = require("../models/Pool");
const CollectionModel = require("../models/Collection");
const NotificationModel = require("../models/Notification");
const asyncHandler = require("../middlewares/async");

exports.globalSearch = asyncHandler(async (req, res, next) => {
  try {
    const { q } = req.query;
    if (q !== "") {
      const nftData = await NftModel.find({
        name: { $regex: q, $options: "i" },
      }).select("_id name mediaLinks");

      const userData = await UserModel.find({
        $and: [
          {
            $or: [
              { name: { $regex: q, $options: "i" } },
              { username: { $regex: q, $options: "i" } },
            ],
          },
          { role: { $ne: "admin" } },
        ],
      }).select("_id name username profileImage");

      const validatorData = await ValidatorModel.find({
        $and: [
          {
            $or: [
              { name: { $regex: q, $options: "i" } },
              { username: { $regex: q, $options: "i" } },
            ],
          },
          { whitelisted: true },
        ],
      }).select("_id name username profileImage");

      const poolData = await PoolModel.find({
        name: { $regex: q, $options: "i" },
      }).select("_id name profile_image");

      const collectionData = await CollectionModel.find({
        name: { $regex: q, $options: "i" },
      }).select("_id name profileImage");

      res.status(200).json({
        data: {
          nft: nftData,
          collection: collectionData,
          user: userData,
          validator: validatorData,
          pool: poolData,
        },
      });
    } else {
      res.status(200).json({
        success: true,
        data: {},
      });
    }
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.changeNotificationStatus = asyncHandler(async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    let data = await NotificationModel.findOneAndUpdate(
      { _id: notificationId },
      { action: false }
    );
    if (data) {
      res.status(201).json({ success: true, message: "Notification updated" });
    } else {
      res
        .status(401)
        .json({ success: false, message: "Notification failed to update" });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});
