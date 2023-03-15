const asyncHandler = require("../middlewares/async");
const NftModel = require("../models/NFT");

exports.fixPriceListNft = asyncHandler(async (req, res, next) => {
  try {
    const { price, duration } = req.body;
    const { assetId } = req.params;
    NftModel.findOneAndUpdate(
      { _id: assetId },
      {
        listingPrice: price,
        listedOnMarketplace: true,
        nftOccupied: true,
        listingDate: new Date(),
        listingDuration: duration,
      },
      null,
      (err, doc) => {
        if (err) {
          res.status(401).json({ success: false });
        } else {
          if (!!doc) {
            res
              .status(201)
              .json({ success: true, message: "Asset listed successfully" });
          } else {
            res.status(401).json({ success: false });
          }
        }
      }
    );
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.buyNft = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const data = await NftModel.findOneAndUpdate(
      { _id: assetId },
      {
        listingPrice: 0,
        listedOnMarketplace: false,
        nftOccupied: false,
        listingDate: undefined,
        listingDuration: 0,
      }
    );
    if (data) {

      // Add to nft histroy
      res.status(201).json({ success: true });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});
