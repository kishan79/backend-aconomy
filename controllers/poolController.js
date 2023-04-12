const PoolModel = require("../models/Pool");
const asyncHandler = require("../middlewares/async");
const UserModel = require("../models/User");

exports.getPools = asyncHandler(async (req, res, next) => {
  try {
    res.status(200).json(res.advancedResults);
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
      message: "Failed to execute",
    });
  }
});

exports.fetchPool = asyncHandler(async (req, res, next) => {
  try {
    const { poolId } = req.params;
    if (!!nftId) {
      PoolModel.findOne({ _id: poolId }, (err, doc) => {
        if (err) {
          res.status(400).json({ success: false, data: {} });
        } else {
          res.status(200).json({ success: true, data: doc });
        }
      });
    } else {
      res.status(400).json({ success: false });
    }
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.createPool = asyncHandler(async (req, res, next) => {
  try {
    const { wallet_address, id } = req.user;
    PoolModel.create(
      {
        ...req.body,
        pool_owner: id,
        pool_owner_address: wallet_address,
      },
      (err, doc) => {
        if (err) {
          res.status(401).json({ success: false });
        } else {
          if (!!doc) {
            res.status(201).json({
              success: true,
              message: "Pool successfully created",
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
    res.status(400).json({
      success: false,
    });
  }
});

exports.addLender = asyncHandler(async (req, res, next) => {
  try {
    const { poolId } = req.params;
    const { wallet_address } = req.user;
    const { address } = req.body;
    let poolData = await PoolModel.findOne({ _id: poolId });
    if (poolData && poolData.pool_owner_address === wallet_address) {
      let user = await UserModel.findOne({ wallet_address: address });
      if (user) {
        let data = await PoolModel.findOneAndUpdate(
          { _id: poolId },
          {
            $push: {
              lenders: user._id,
            },
          }
        );
        if (data) {
          res
            .status(201)
            .json({ success: true, message: "Lender successfully added" });
        } else {
          res
            .status(401)
            .json({ success: false, message: "Failed to add lender" });
        }
      } else {
        res
          .status(401)
          .json({
            success: false,
            message: `No user found with address ${address}`,
          });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only pool owner can perform this action",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false, err });
  }
});

exports.addBorrower = asyncHandler(async (req, res, next) => {
  try {
    const { poolId } = req.params;
    const { wallet_address } = req.user;
    const { address } = req.body;
    let poolData = await PoolModel.findOne({ _id: poolId });
    if (poolData && poolData.pool_owner_address === wallet_address) {
      let user = await UserModel.findOne({ wallet_address: address });
      if (user) {
        let data = await PoolModel.findOneAndUpdate(
          { _id: poolId },
          {
            $push: {
              borrowers: user._id,
            },
          }
        );
        if (data) {
          res
            .status(201)
            .json({ success: true, message: "Borrower successfully added" });
        } else {
          res
            .status(401)
            .json({ success: false, message: "Failed to add borrower" });
        }
      } else {
        res
          .status(401)
          .json({
            success: false,
            message: `No user found with address ${address}`,
          });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only pool owner can perform this action",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false, err });
  }
});

exports.makeoffer = asyncHandler(async (req, res, next) => {
  try {
    const { pool_id } = req.params;
    const data = await PoolModel.findOneAndUpdate(
      { _id: pool_id },
      {
        $push: {
          offers: {
            pool_id,
            amount: 500,
            status: true,
            apy_precent: 10,
            duration: 30,
            expireOn: "Sat Feb 18 2023 13:22:31 GMT+0530",
          },
        },
      }
    );
    res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
    });
  }
});
