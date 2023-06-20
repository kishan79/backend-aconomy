const NftModel = require("../models/NFT");
const UserModel = require("../models/User");
const ValidatorModel = require("../models/Validator");
const PoolModel = require("../models/Pool");
const CollectionModel = require("../models/Collection");
const asyncHandler = require("../middlewares/async");

exports.globalSearch = asyncHandler(async (req, res, next) => {
  try {
    const { q } = req.query;
    if (q !== "") {
      const nftData = await NftModel.find({
        name: { $regex: q, $options: "i" },
      }).select("_id name");

      const userData = await UserModel.find({
        $or: [
          { name: { $regex: q, $options: "i" } },
          { username: { $regex: q, $options: "i" } },
        ],
      }).select("_id name username");

      const validatorData = await ValidatorModel.find({
        $or: [
          { name: { $regex: q, $options: "i" } },
          { username: { $regex: q, $options: "i" } },
        ],
      }).select("_id name username");

      const poolData = await PoolModel.find({
        name: { $regex: q, $options: "i" },
      }).select("_id name");

      const collectionData = await CollectionModel.find({
        name: { $regex: q, $options: "i" },
      }).select("_id name");

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
