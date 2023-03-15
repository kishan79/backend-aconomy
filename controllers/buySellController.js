const asyncHandler = require("../middlewares/async");
const NftModel = require("../models/NFT");

exports.fixPriceListNft = asyncHandler(async (req, res, next) => {
  try {
    const { price } = req.body;
    const { assetId } = req.params;
    NftModel.findOneAndUpdate(
      { _id: assetId },
      {
        listingPrice: price,
        listedOnMarketplace: true,
        nftOccupied: true,
      }
    );
  } catch (err) {
    res.status(401).json({ success: false });
  }
});
