const PoolModel = require("../models/Pool");
const asyncHandler = require("../middlewares/async");
const UserModel = require("../models/User");
const LenderOfferModel = require("../models/LenderOffer");
const LoanRequestModel = require("../models/LoanRequest");

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
              .json({ success: false, message: "Failed to create pool" });
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
        res.status(401).json({
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
        res.status(401).json({
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
    const { wallet_address, id } = req.user;
    let poolData = await PoolModel.findOne({ _id: pool_id });
    if (poolData && poolData.pool_owner_address !== wallet_address) {
      LenderOfferModel.create(
        {
          ...req.body,
          pool: pool_id,
          lender: id,
          lenderAddress: wallet_address,
        },
        (err, doc) => {
          if (err) {
            res.status(401).json({ success: false });
          } else {
            if (!!doc) {
              res.status(201).json({
                success: true,
                message: "Offer made successfully",
              });
            } else {
              res
                .status(401)
                .json({ success: false, message: "Failed to make offer" });
            }
          }
        }
      );
    } else {
      res
        .status(401)
        .json({ success: false, message: "Pool owner can't make an offer" });
    }
  } catch (err) {
    res.status(400).json({
      success: false,
      err,
    });
  }
});

exports.acceptOffer = asyncHandler(async (req, res, next) => {
  try {
    const { pool_id, bid_id } = req.params;
    const { wallet_address } = req.user;
    let poolData = await PoolModel.findOne({ _id: pool_id });
    if (poolData && poolData.pool_owner_address === wallet_address) {
      let offerData = await LenderOfferModel.findOne({ pool_id, bid_id });
      if (offerData.status === "none") {
        let data = await LenderOfferModel.findOneAndUpdate(
          { pool_id, bid_id },
          {
            status: "accepted",
          }
        );
        if (data) {
          res
            .status(201)
            .json({ success: true, message: "Offer accepted successfully" });
        } else {
          res
            .status(401)
            .json({ success: false, message: "Failed to accept the offer" });
        }
      } else {
        res.status(401).json({ success: false, message: "Forbidden action" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Pool owner can only accpet an offer",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.rejectOffer = asyncHandler(async (req, res, next) => {
  try {
    const { pool_id, bid_id } = req.params;
    const { wallet_address } = req.user;
    let poolData = await PoolModel.findOne({ _id: pool_id });
    if (poolData && poolData.pool_owner_address === wallet_address) {
      let offerData = await LenderOfferModel.findOne({ pool_id, bid_id });
      if (offerData.status === "none") {
        let data = await LenderOfferModel.findOneAndUpdate(
          { pool_id, bid_id },
          {
            status: "rejected",
          }
        );
        if (data) {
          res
            .status(201)
            .json({ success: true, message: "Offer accepted successfully" });
        } else {
          res
            .status(401)
            .json({ success: false, message: "Failed to accept the offer" });
        }
      } else {
        res.status(401).json({ success: false, message: "Forbidden action" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Pool owner can only accpet an offer",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.fetchLenderOffers = asyncHandler(async (req, res, next) => {
  try {
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.requestLoan = asyncHandler(async (req, res, next) => {
  try {
    const { pool_id } = req.params;
    const { wallet_address, id } = req.user;
    let poolData = await PoolModel.findOne({ _id: pool_id });
    if (poolData && poolData.pool_owner_address !== wallet_address) {
      LoanRequestModel.create(
        {
          ...req.body,
          pool: pool_id,
          borrower: id,
          borrowerAddress: wallet_address,
        },
        (err, doc) => {
          if (err) {
            res.status(401).json({ success: false });
          } else {
            if (!!doc) {
              res.status(201).json({
                success: true,
                message: "Loan Requested successfully",
              });
            } else {
              res
                .status(401)
                .json({ success: false, message: "Failed to request loan" });
            }
          }
        }
      );
    } else {
      res.status(401).json({
        success: false,
        message: "Pool owner can't make a loan request",
      });
    }
  } catch (err) {
    res.status(400).json({
      success: false,
      err,
    });
  }
});
