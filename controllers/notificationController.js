const NotificationModel = require("../models/Notification");
const asyncHandler = require("../middlewares/async");
const {
  userSelectQuery,
  validatorSelectQuery,
  nftSelectQuery,
  poolSelectQuery
} = require("../utils/selectQuery");

exports.fetchNotifications = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, read } = req.query;
    const { id, role } = req.user;

    let queryStr = {
      read: read === "true" ? true : false,
    };
    if (role === "user") {
      queryStr["user"] = id;
    } else {
      queryStr["validator"] = id;
    }

    query = NotificationModel.find(queryStr)
      .select("-__v -updatedAt")
      .populate([
        { path: "nft", select: nftSelectQuery },
        { path: "user", select: userSelectQuery },
        { path: "validator", select: validatorSelectQuery },
        { path: "swapnft", select: nftSelectQuery},
        { path: "pool", select: poolSelectQuery },
        { path: "user2", select: userSelectQuery},
      ]);

    if (sortby) {
      const sortBy = sortby.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await NotificationModel.countDocuments(queryStr);
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

exports.readNotification = asyncHandler(async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const data = await NotificationModel.findOneAndUpdate(
      { _id: notificationId },
      { read: true }
    );
    if (data) {
      res.status(201).json({ success: true, message: "Notification read" });
    } else {
      res
        .status(401)
        .json({ success: false, message: "Notification not read" });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.readAllNotifications = asyncHandler(async (req, res, next) => {
  try {
    const { id, role } = req.user;
    if (role === "user") {
      const data = await NotificationModel.updateMany(
        { user: id, read: false },
        { read: true }
      );
      if (data) {
        res.status(201).json({ success: true, message: "All notification read" });
      } else {
        res
          .status(401)
          .json({ success: false, message: "Notification not read" });
      }
    } else {
      const data = await NotificationModel.updateMany(
        { validator: id, read: false },
        { read: true }
      );
      if (data) {
        res.status(201).json({ success: true, message: "All notification read" });
      } else {
        res
          .status(401)
          .json({ success: false, message: "Notification not read" });
      }
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});
