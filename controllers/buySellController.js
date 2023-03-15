const asyncHandler = require("../middlewares/async");
const NftModel = require("../models/NFT");

exports.fixPriceListNft = asyncHandler(async (req, res, next) => {
  try {
    const { price, duration } = req.body;
    const { assetId } = req.params;
    const { id } = req.user;
    let data = await NftModel.findOne({ _id: assetId });
    if (!data.listedOnMarketplace) {
      NftModel.findOneAndUpdate(
        { _id: assetId },
        {
          listingPrice: price,
          listedOnMarketplace: true,
          nftOccupied: true,
          listingDate: new Date(),
          listingDuration: duration,
          $push: {
            history: {
              action: "Listed",
              user: id,
              amount: price,
            },
          },
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
    } else {
      res.status(401).json({ success: false, message: "Asset already listed" });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.buyNft = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { id } = req.user;
    let data = await NftModel.findOne({ _id: assetId });
    if (data.listedOnMarketplace) {
      NftModel.findOneAndUpdate(
        { _id: assetId },
        {
          listingPrice: 0,
          listedOnMarketplace: false,
          nftOccupied: false,
          listingDate: undefined,
          listingDuration: 0,
          $push: {
            history: {
              action: "bought",
              user: id,
              amount: data.listingPrice,
            },
          },
        },
        null,
        (err, doc) => {
          if (err) {
            res.status(401).json({ success: false });
          } else {
            if (!!doc) {
              res
                .status(201)
                .json({ success: true, message: "Asset bought successfully" });
            } else {
              res.status(401).json({ success: false });
            }
          }
        }
      );
    } else {
      res
        .status(401)
        .json({ success: false, message: "Asset not listed on marketplace" });
    }
  } catch (err) {
    res.status(401).json({ success: false, err });
  }
});

exports.editFixedPriceSale = asyncHandler(async (req, res, next) => {
  try{
    const {assetId} = req.params;
    const {price, duration} = req.body;
    let data = await NftModel.findOne({ _id: assetId });
    if (data.listedOnMarketplace) {
      NftModel.findOneAndUpdate(
        { _id: assetId },
        {
          listingPrice: price,
          listedOnMarketplace: true,
          nftOccupied: true,
          listingDuration: duration
        },
        null,
        (err, doc) => {
          if (err) {
            res.status(401).json({ success: false });
          } else {
            if (!!doc) {
              res
                .status(201)
                .json({ success: true, message: "Asset sale edited successfully" });
            } else {
              res.status(401).json({ success: false });
            }
          }
        }
      );
    } else {
      res
        .status(401)
        .json({ success: false, message: "Asset not listed on marketplace" });
    }
  } catch(err){
    res.status(401).json({success:false})
  }
});
