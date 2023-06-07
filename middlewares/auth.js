const jwt = require("jsonwebtoken");
const asyncHandler = require("./async");
const ErrorResponse = require("../utils/errorResponse");
const User = require("../models/User");
const Validator = require("../models/Validator");

exports.protect = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role == "user" || decoded.role == "admin") {
      req.user = await User.findById(decoded.id);
    } else if (decoded.role == "validator") {
      req.user = await Validator.findById(decoded.id);
    }

    next();
  } catch (err) {
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }
});

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

exports.validateOwner = asyncHandler(async (req, res, next) => {
  const { wallet_address } = req.params;
  if (wallet_address === req.user.wallet_address) {
    next();
  } else {
    return next(new ErrorResponse("Forbidden Action", 403));
  }
});
