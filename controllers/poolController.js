const PoolModel = require("../models/Pool");
const asyncHandler = require("../middlewares/async");
const UserModel = require("../models/User");
const ValidatorModel = require("../models/Validator");
const OfferModel = require("../models/Offer");
const NotificationModel = require("../models/Notification");
const { Role, checkWhitelist, validateWhitelist } = require("../utils/utils");
const { userSelectQuery, poolSelectQuery } = require("../utils/selectQuery");

exports.getPools = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, verification } = req.query;

    let queryStr = {
      // is_verified: verification === "verified" ? true : false,
      visibility: "public",
    };

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

exports.myPools = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, verification } = req.query;
    const { id } = req.params;

    let queryStr = {
      pool_owner: id,
      // is_verified: verification === "verified" ? true : false,
    };

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

exports.fetchPool = asyncHandler(async (req, res, next) => {
  try {
    const { poolId } = req.params;
    let activeLoans = 0,
      repaidLoans = 0,
      totalDuration = 0,
      totalAPY = 0;
    let data = await PoolModel.findOne({ _id: poolId })
      .populate([{ path: "lenders", select: userSelectQuery }])
      .lean();
    if (data) {
      let activeLoanData = await OfferModel.find({
        pool: poolId,
        status: "accepted",
      });
      for (let i = 0; i < activeLoanData.length; i++) {
        activeLoans += activeLoanData[i].amount;
        totalDuration += activeLoanData[i].duration;
        totalAPY += activeLoanData[i].apy_percent;
      }
      let repaidLoanData = await OfferModel.find({
        pool: poolId,
        status: "repaid",
      });
      for (let i = 0; i < repaidLoanData.length; i++) {
        repaidLoans += repaidLoanData[i].amount;
      }
      res.status(200).json({
        success: true,
        data: {
          ...data,
          activeLoans,
          repaidLoans,
          averageDuration: totalDuration / activeLoanData.length,
          averageAPY: totalAPY / activeLoanData.length,
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

exports.addLender = asyncHandler(async (req, res, next) => {
  try {
    const { poolId } = req.params;
    const { wallet_address } = req.user;
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
    const { wallet_address } = req.user;
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
    // const { wallet_address } = req.user;
    let poolData = await PoolModel.findOne({ _id: poolId }).populate({
      path: "lenders.lender",
      select: userSelectQuery,
    });
    // if (poolData && poolData.pool_owner_address === wallet_address) {
    res.status(201).json({ success: true, data: poolData.lenders });
    // } else {
    //   res.status(401).json({
    //     success: false,
    //     message: "Only pool owner can perform this action",
    //   });
    // }
  } catch (err) {
    res.status(401).json({ success: false, err });
  }
});

exports.fetchBorrower = asyncHandler(async (req, res, next) => {
  try {
    const { poolId } = req.params;
    // const { wallet_address } = req.user;
    let poolData = await PoolModel.findOne({ _id: poolId }).populate({
      path: "borrowers.borrower",
      select: userSelectQuery,
    });
    // if (poolData && poolData.pool_owner_address === wallet_address) {
    res.status(201).json({ success: true, data: poolData.borrowers });
    // } else {
    //   res.status(401).json({
    //     success: false,
    //     message: "Only pool owner can perform this action",
    //   });
    // }
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
    const { wallet_address } = req.user;
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
        (err, doc) => {
          if (err) {
            res.status(401).json({ success: false, err });
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
    const { wallet_address } = req.user;
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
    const { wallet_address } = req.user;
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
            [data.borrowerType === "User" ? "user" : "validator"]: data.borrower,
            amount: data.amount,
          });
          if (notification) {
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
    const { wallet_address } = req.user;
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
    const { wallet_address } = req.user;
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
