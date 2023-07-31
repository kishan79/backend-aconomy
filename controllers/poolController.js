const PoolModel = require("../models/Pool");
const asyncHandler = require("../middlewares/async");
const UserModel = require("../models/User");
const ValidatorModel = require("../models/Validator");
const OfferModel = require("../models/Offer");
const NotificationModel = require("../models/Notification");
const { Role, checkWhitelist, validateWhitelist } = require("../utils/utils");
const { userSelectQuery, poolSelectQuery } = require("../utils/selectQuery");
const mixpanel = require("../services/mixpanel");

exports.getPools = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, verification, search } = req.query;

    let queryStr = {
      is_verified: verification === "verified" ? true : false,
      visibility: "public",
    };

    if (search) {
      queryStr = { ...queryStr, name: { $regex: search, $options: "i" } };
    }

    query = PoolModel.find(queryStr)
      .select(poolSelectQuery)
      .populate([
        {
          path: "pool_owner",
          select:
            "-assetType -bio -email -signatureMessage -document -createdAt -updatedAt -__v -username -role",
        },
        { path: "lenders", select: userSelectQuery },
        { path: "borrowers", select: userSelectQuery },
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
    const total = await PoolModel.countDocuments(queryStr);
    query = query.skip(startIndex).limit(limit);

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

exports.myPools = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, verification, visibility, search } = req.query;
    const { id } = req.params;

    let queryStr = {
      pool_owner: id,
      // is_verified: verification === "verified" ? true : false,
    };

    if (search) {
      queryStr = { ...queryStr, name: { $regex: search, $options: "i" } };
    }

    if (visibility) {
      queryStr = { ...queryStr, visibility };
    }

    query = PoolModel.find(queryStr)
      .select(poolSelectQuery)
      .populate([
        {
          path: "pool_owner",
          select:
            "-assetType -bio -email -signatureMessage -document -createdAt -updatedAt -favouriteNFT -__v -username -role",
        },
        { path: "lenders", select: userSelectQuery },
        { path: "borrowers", select: userSelectQuery },
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
    const total = await PoolModel.countDocuments(queryStr);
    query = query.skip(startIndex).limit(limit);

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

exports.fetchPool = asyncHandler(async (req, res, next) => {
  try {
    const { poolId } = req.params;
    let activeLoans = 0,
      repaidLoans = 0,
      totalDuration = 0,
      totalAPY = 0;
    let data = await PoolModel.findOne({ _id: poolId })
      .populate([
        { path: "pool_owner", select: "_id name profileImage" },
        {
          path: "lenders.lender",
          select: "_id name profileImage wallet_address",
        },
        {
          path: "borrowers.borrower",
          select: "_id name profileImage wallet_address",
        },
      ])
      .lean();
    if (data) {
      let activeLoanData = await OfferModel.find({
        pool: poolId,
        status: "accepted",
      }).select("amount duration apy_percent");
      for (let i = 0; i < activeLoanData.length; i++) {
        activeLoans += activeLoanData[i].amount;
        totalDuration += activeLoanData[i].duration;
        totalAPY += activeLoanData[i].apy_percent;
      }
      let repaidLoanData = await OfferModel.find({
        pool: poolId,
        status: "repaid",
      }).select("amount");
      for (let i = 0; i < repaidLoanData.length; i++) {
        repaidLoans += repaidLoanData[i].amount;
      }
      res.status(200).json({
        success: true,
        data: {
          ...data,
          activeLoans,
          repaidLoans,
          averageDuration: activeLoanData.length
            ? Math.round(totalDuration / activeLoanData.length)
            : 0,
          averageAPY: activeLoanData.length
            ? Math.round(totalAPY / activeLoanData.length)
            : 0,
        },
      });
    } else {
      res.status(400).json({ success: false, data: {} });
    }
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.createPool = asyncHandler(async (req, res, next) => {
  try {
    const { wallet_address, id } = req.user;
    let whitelistData = await checkWhitelist(req.body);
    PoolModel.create(
      {
        ...req.body,
        pool_owner: id,
        pool_owner_address: wallet_address,
        whitelist: whitelistData,
      },
      async (err, doc) => {
        if (err) {
          res.status(401).json({ success: false });
        } else {
          if (!!doc) {
            let poolData = await PoolModel.findOneAndUpdate(
              { _id: doc._id },
              {
                $push: {
                  lenders: {
                    lender: id,
                    lenderType: "Validator",
                  },
                  borrowers: {
                    borrower: id,
                    borrowerType: "Validator",
                  },
                },
              }
            );
            if (poolData) {
              await mixpanel.track("Pool created", {
                distinct_id: id,
                poolId: doc.poolId,
                pool: doc._id,
              });
              res.status(201).json({
                success: true,
                message: "Pool successfully created",
              });
            } else {
              res.status(401).json({
                success: false,
                message: "Failed to create pool with lender & borrower",
              });
            }
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

exports.updatePool = asyncHandler(async (req, res, next) => {
  try {
    const { poolId } = req.params;
    const { wallet_address, id } = req.user;
    let pool = await PoolModel.findOne({ _id: poolId });
    if (pool && pool.pool_owner_address === wallet_address) {
      PoolModel.findOneAndUpdate(
        { _id: poolId },
        { ...req.body },
        null,
        async (err, doc) => {
          if (err) {
            res
              .status(400)
              .json({ success: false, message: "Pool failed to update" });
          } else {
            if (!!doc) {
              await mixpanel.track("Pool updated", {
                distinct_id: id,
                pool: doc._id,
              });
              res.status(201).json({
                success: true,
                message: "Pool successfully updated",
              });
            } else {
              res
                .status(400)
                .json({ success: false, message: "Wrong pool id" });
            }
          }
        }
      );
    } else {
      res.status(400).json({ success: true, message: "Forbidden Action" });
    }
  } catch (err) {
    res.status(400).json({ success: false, message: "Pool failed to update" });
  }
});

exports.addLender = asyncHandler(async (req, res, next) => {
  try {
    const { poolId } = req.params;
    const { wallet_address, id } = req.user;
    const { address } = req.body;
    let poolData = await PoolModel.findOne({ _id: poolId });
    if (
      poolData &&
      poolData.lender_whitelisted &&
      poolData.pool_owner_address === wallet_address
    ) {
      let user = await UserModel.findOne({ wallet_address: address });
      if (!user) {
        user = await ValidatorModel.findOne({ wallet_address: address });
      }

      if (user) {
        let data = await PoolModel.findOneAndUpdate(
          { _id: poolId },
          {
            $push: {
              lenders: {
                lender: user._id,
                lenderType: Role[user.role],
              },
            },
          }
        );
        if (data) {
          await mixpanel.track("Pool lender added", {
            distinct_id: id,
            pool: poolId,
          });
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
        message:
          "Only pool owner can perform this action or whitelisting is not allowed",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false, err });
  }
});

exports.removeLender = asyncHandler(async (req, res, next) => {
  try {
    const { poolId, lenderId } = req.params;
    const { wallet_address, id } = req.user;
    let poolData = await PoolModel.findOne({ _id: poolId }).populate({
      path: "lenders.lender",
      select: userSelectQuery,
    });
    if (
      poolData &&
      poolData.lender_whitelisted &&
      poolData.pool_owner_address === wallet_address
    ) {
      let lenderData = poolData.lenders.filter(
        (item) => item.lender._id == lenderId
      );
      let data = await PoolModel.findOneAndUpdate(
        { _id: poolId },
        { $pull: { lenders: { _id: lenderData[0]._id } } }
      );
      if (data) {
        await mixpanel.track("Pool lender removed", {
          distinct_id: id,
          pool: poolId,
        });
        res
          .status(201)
          .json({ success: true, message: "Lender successfully removed" });
      } else {
        res
          .status(401)
          .json({ success: false, message: "Failed to remove lender" });
      }
    } else {
      res.status(401).json({
        success: false,
        message:
          "Only pool owner can perform this action or whitelisting is not allowed",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false, err });
  }
});

exports.fetchLender = asyncHandler(async (req, res, next) => {
  try {
    const { poolId } = req.params;
    let poolData = await PoolModel.findOne({ _id: poolId })
      .populate({
        path: "lenders.lender",
        select: "_id name profileImage",
      })
      .lean();
    if (poolData) {
      let offerData = await OfferModel.find({
        pool: poolId,
        type: "lenderOffer",
      })
        .select("lender status amount")
        .lean();
      for (let i = 0; i < poolData.lenders.length; i++) {
        let amountOffered = 0,
          closedLoan = 0,
          activeLoan = 0;
        for (let j = 0; j < offerData.length; j++) {
          if (poolData.lenders[i].lender._id.equals(offerData[j].lender)) {
            if (offerData[j].status === "accepted") {
              activeLoan += 1;
            }
            if (offerData[j].status === "repaid") {
              closedLoan += 1;
            }
            amountOffered += offerData[j].amount;
          }
        }
        poolData.lenders[i].lender = {
          ...poolData.lenders[i].lender,
          amountOffered,
          closedLoan,
          activeLoan,
        };
      }
    }
    res.status(201).json({ success: true, data: poolData.lenders });
  } catch (err) {
    res.status(401).json({ success: false, err });
  }
});

exports.fetchBorrower = asyncHandler(async (req, res, next) => {
  try {
    const { poolId } = req.params;
    let poolData = await PoolModel.findOne({ _id: poolId })
      .populate({
        path: "borrowers.borrower",
        select: "_id name profileImage",
      })
      .lean();
    if (poolData) {
      let offerData = await OfferModel.find({
        $and: [
          { pool: poolId },
          { $or: [{ status: "accepted" }, { status: "repaid" }] },
        ],
      })
        .select("borrower status amount")
        .lean();

      for (let i = 0; i < poolData.borrowers.length; i++) {
        let amountBorrowed = 0,
          loansPaid = 0,
          loansDefaulted = 0;
        for (let j = 0; j < offerData.length; j++) {
          if (
            poolData.borrowers[i].borrower._id.equals(offerData[j].borrower)
          ) {
            if (offerData[j].status === "defaulted") {
              loansDefaulted += 1;
            }
            if (offerData[j].status === "repaid") {
              loansPaid += 1;
            }
            amountBorrowed += offerData[j].amount;
          }
        }
        poolData.borrowers[i].borrower = {
          ...poolData.borrowers[i].borrower,
          amountBorrowed,
          loansPaid,
          loansDefaulted,
        };
      }
    }
    res.status(201).json({ success: true, data: poolData.borrowers });
  } catch (err) {
    res.status(401).json({ success: false, err });
  }
});

exports.addBorrower = asyncHandler(async (req, res, next) => {
  try {
    const { poolId } = req.params;
    const { wallet_address, id } = req.user;
    const { address } = req.body;
    let poolData = await PoolModel.findOne({ _id: poolId });
    if (
      poolData &&
      poolData.borrower_whitelisted &&
      poolData.pool_owner_address === wallet_address
    ) {
      let user = await UserModel.findOne({ wallet_address: address });
      if (!user) {
        user = await ValidatorModel.findOne({ wallet_address: address });
      }

      if (user) {
        let data = await PoolModel.findOneAndUpdate(
          { _id: poolId },
          {
            $push: {
              borrowers: {
                borrower: user._id,
                borrowerType: Role[user.role],
              },
            },
          }
        );
        if (data) {
          await mixpanel.track("Pool borrower added", {
            distinct_id: id,
            pool: poolId,
          });
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
        message:
          "Only pool owner can perform this action or whitelisting is not allowed",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false, err });
  }
});

exports.removeBorrower = asyncHandler(async (req, res, next) => {
  try {
    const { poolId, borrowerId } = req.params;
    const { wallet_address, id } = req.user;
    let poolData = await PoolModel.findOne({ _id: poolId }).populate({
      path: "borrowers.borrower",
      select: userSelectQuery,
    });
    if (
      poolData &&
      poolData.borrower_whitelisted &&
      poolData.pool_owner_address === wallet_address
    ) {
      let borrowerData = poolData.borrowers.filter(
        (item) => item.borrower._id == borrowerId
      );
      let data = await PoolModel.findOneAndUpdate(
        { _id: poolId },
        { $pull: { borrowers: { _id: borrowerData[0]._id } } }
      );
      if (data) {
        await mixpanel.track("Pool borrower removed", {
          distinct_id: id,
          pool: poolId,
        });
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
        message:
          "Only pool owner can perform this action or whitelisting is not allowed",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false, err });
  }
});

exports.makeoffer = asyncHandler(async (req, res, next) => {
  try {
    const { pool_id } = req.params;
    const { wallet_address, id, role } = req.user;
    let poolData = await PoolModel.findOne({ _id: pool_id });
    // if (poolData && poolData.lenders.includes(id)) {
    if (poolData && validateWhitelist(poolData, id, "makeoffer")) {
      OfferModel.create(
        {
          ...req.body,
          pool: pool_id,
          lender: id,
          lenderAddress: wallet_address,
          lenderType: Role[role],
          type: "lenderOffer",
        },
        async (err, doc) => {
          if (err) {
            res.status(401).json({ success: false, err });
          } else {
            if (!!doc) {
              await mixpanel.track("Pool make offer", {
                distinct_id: id,
                pool: pool_id,
              });
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
      res.status(401).json({
        success: false,
        message: "Only authorised lender can make an offer",
      });
    }
  } catch (err) {
    res.status(401).json({
      success: false,
      err,
    });
  }
});

exports.acceptOffer = asyncHandler(async (req, res, next) => {
  try {
    const { pool_id, bid_id } = req.params;
    const { wallet_address, id } = req.user;
    let poolData = await PoolModel.findOne({ _id: pool_id });
    if (poolData && poolData.pool_owner_address === wallet_address) {
      let offerData = await OfferModel.findOne({ pool: pool_id, bid_id });
      if (offerData.status === "none") {
        let data = await OfferModel.findOneAndUpdate(
          { pool: pool_id, bid_id },
          {
            status: "accepted",
          }
        );
        if (data) {
          let notification = await NotificationModel.create({
            pool: data.pool,
            category: "pool-offer-accept",
            [data.lenderType === "User" ? "user" : "validator"]: data.lender,
          });
          if (notification) {
            await mixpanel.track("Pool offer accepted", {
              distinct_id: id,
              pool: pool_id,
            });
            res
              .status(201)
              .json({ success: true, message: "Offer accepted successfully" });
          }
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
        message: "Pool owner can only accept an offer",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false, err });
  }
});

exports.rejectOffer = asyncHandler(async (req, res, next) => {
  try {
    const { pool_id, bid_id } = req.params;
    const { wallet_address, id } = req.user;
    let poolData = await PoolModel.findOne({ _id: pool_id });
    if (poolData && poolData.pool_owner_address === wallet_address) {
      let offerData = await OfferModel.findOne({ pool: pool_id, bid_id });
      if (offerData.status === "none") {
        let data = await OfferModel.findOneAndUpdate(
          { pool: pool_id, bid_id },
          {
            status: "rejected",
          }
        );
        if (data) {
          let notification = await NotificationModel.create({
            pool: data.pool,
            category: "pool-offer-reject",
            [data.lenderType === "User" ? "user" : "validator"]: data.lender,
          });
          if (notification) {
            await mixpanel.track("Pool offer rejected", {
              distinct_id: id,
              pool: pool_id,
            });
            res
              .status(201)
              .json({ success: true, message: "Offer accepted successfully" });
          }
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
    let query;

    const { sortby } = req.query;

    let queryStr = {
      pool: req.params.pool_id,
      type: "lenderOffer",
    };

    query = OfferModel.find(queryStr).populate({
      path: "lender",
      select:
        "-assetType -bio -email -signatureMessage -document -createdAt -updatedAt -__v -username -role -termOfService",
    });

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
    const total = await OfferModel.countDocuments(queryStr);
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

exports.requestLoan = asyncHandler(async (req, res, next) => {
  try {
    const { pool_id } = req.params;
    const { wallet_address, id, role } = req.user;
    let poolData = await PoolModel.findOne({ _id: pool_id });
    // if (poolData && poolData.borrowers.includes(id)) {
    if (poolData && validateWhitelist(poolData, id, "requestLoan")) {
      OfferModel.create(
        {
          ...req.body,
          pool: pool_id,
          borrower: id,
          borrowerAddress: wallet_address,
          borrowerType: Role[role],
          type: "loanRequest",
        },
        async (err, doc) => {
          if (err) {
            res.status(401).json({ success: false });
          } else {
            if (!!doc) {
              await mixpanel.track("Pool loan requested", {
                distinct_id: id,
                pool: poolId,
              });
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
        message: "Only authorised borrower can request for loan",
      });
    }
  } catch (err) {
    res.status(400).json({
      success: false,
      err,
    });
  }
});

exports.acceptLoan = asyncHandler(async (req, res, next) => {
  try {
    const { pool_id, loan_id } = req.params;
    const { id } = req.user;
    let poolData = await PoolModel.findOne({ _id: pool_id });
    // if (poolData && poolData.lenders.includes(id)) {
    if (poolData && validateWhitelist(poolData, id, "acceptLoan")) {
      let offerData = await OfferModel.findOne({ pool: pool_id, loan_id });
      if (offerData.status === "none") {
        let data = await OfferModel.findOneAndUpdate(
          { pool: pool_id, loan_id },
          {
            status: "accepted",
          }
        );
        if (data) {
          let notification = await NotificationModel.create({
            pool: data.pool,
            category: "pool-loan-accept",
            [data.borrowerType === "User" ? "user" : "validator"]:
              data.borrower,
            amount: data.amount,
          });
          if (notification) {
            await mixpanel.track("Pool loan accepted", {
              distinct_id: id,
              pool: pool_id,
            });
            res.status(201).json({
              success: true,
              message: "Loan request accepted successfully",
            });
          }
        } else {
          res.status(401).json({
            success: false,
            message: "Failed to accept the loan request",
          });
        }
      } else {
        res.status(401).json({ success: false, message: "Forbidden action" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only authorised lender can accept the loan request",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.fetchLoanRequests = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby } = req.query;

    let queryStr = {
      pool: req.params.pool_id,
      type: "loanRequest",
    };

    query = OfferModel.find(queryStr).populate({
      path: "borrower",
      select:
        "-assetType -bio -email -signatureMessage -document -createdAt -updatedAt -__v -username -role -termOfService",
    });

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
    const total = await OfferModel.countDocuments(queryStr);
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

exports.repayOffer = asyncHandler(async (req, res, next) => {
  try {
    const { pool_id, bid_id } = req.params;
    const { wallet_address, id } = req.user;
    let poolData = await PoolModel.findOne({ _id: pool_id });
    if (poolData && poolData.pool_owner_address === wallet_address) {
      let offerData = await OfferModel.findOne({ pool: pool_id, bid_id });
      if (offerData.status === "accepted") {
        let data = await OfferModel.findOneAndUpdate(
          { pool: pool_id, bid_id },
          {
            status: "repaid",
          }
        );
        if (data) {
          await mixpanel.track("Pool offer repaid", {
            distinct_id: id,
            pool: pool_id,
            bidId: bid_id
          });
          res.status(201).json({
            success: true,
            message: "Offer repaid successfully",
          });
        } else {
          res.status(401).json({
            success: false,
            message: "Failed to repay offer",
          });
        }
      } else {
        res.status(401).json({ success: false, message: "Forbidden action" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only pool owner can repay the lender offer",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.repayLoan = asyncHandler(async (req, res, next) => {
  try {
    const { pool_id, loan_id } = req.params;
    const { wallet_address, id } = req.user;
    let poolData = await PoolModel.findOne({ _id: pool_id });
    let offerData = await OfferModel.findOne({ pool: pool_id, loan_id });
    if (poolData && offerData.borrowerAddress === wallet_address) {
      if (offerData.status === "accepted") {
        let data = await OfferModel.findOneAndUpdate(
          { pool: pool_id, loan_id },
          {
            status: "repaid",
          }
        );
        if (data) {
          await mixpanel.track("Pool loan repaid", {
            distinct_id: id,
            pool: pool_id,
            loan: loan_id
          });
          res.status(201).json({
            success: true,
            message: "Loan repaid successfully",
          });
        } else {
          res.status(401).json({
            success: false,
            message: "Failed to repay loan",
          });
        }
      } else {
        res.status(401).json({ success: false, message: "Forbidden action" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only authorised borrower can repay the loan",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.fetchFilledOffers = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby } = req.query;

    let queryStr = {
      // pool: req.params.pool_id,
      // status: "accepted",
      $and: [
        { pool: req.params.pool_id },
        { $or: [{ status: "accepted" }, { status: "repaid" }] },
      ],
    };

    query = OfferModel.find(queryStr).populate([
      {
        path: "borrower",
        select:
          "-assetType -bio -email -signatureMessage -document -createdAt -updatedAt -favouriteNFT -__v -role -termOfService",
      },
      {
        path: "lender",
        select:
          "-assetType -bio -email -signatureMessage -document -createdAt -updatedAt -favouriteNFT -__v -role -termOfService",
      },
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
    const total = await OfferModel.countDocuments(queryStr);
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
