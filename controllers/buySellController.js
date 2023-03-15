const asyncHandler = require("../middlewares/async");

exports.listNft = asyncHandler(async (req, res, next) => {
  try {
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(401).json({ success: false });
  }
});
