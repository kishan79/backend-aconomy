const asyncHandler = require("../middlewares/async");
const NftModel = require("../models/NFT");
const AuctionModel = require("../models/Auction");
const { addDays } = require("date-fns");

exports.fixPriceListNft = asyncHandler(async (req, res, next) => {
  try {
    const { price, duration } = req.body;
    const { assetId } = req.params;
    const { id } = req.user;
    let data = await NftModel.findOne({ _id: assetId });
    if (!data.listedOnMarketplace || !data.nftOccupied) {
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
      res.status(401).json({ success: false, message: "Asset Occupied" });
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
  try {
    const { assetId } = req.params;
    const { price, duration } = req.body;
    let data = await NftModel.findOne({ _id: assetId });
    if (data.listedOnMarketplace) {
      NftModel.findOneAndUpdate(
        { _id: assetId },
        {
          listingPrice: price,
          listedOnMarketplace: true,
          nftOccupied: true,
          listingDuration: duration,
        },
        null,
        (err, doc) => {
          if (err) {
            res.status(401).json({ success: false });
          } else {
            if (!!doc) {
              res.status(201).json({
                success: true,
                message: "Asset sale edited successfully",
              });
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
    res.status(401).json({ success: false });
  }
});

exports.listNftForAuction = asyncHandler(async (req, res, next) => {
  try {
    const { id, wallet_address } = req.user;
    const { assetId, duration } = req.body;
    if (!data.listedForAuction || !data.nftOccupied) {
      AuctionModel.create(
        {
          auctionOwner: id,
          auctionOwnerAddress: wallet_address,
          asset: assetId,
          duration,
        },
        async (err, doc) => {
          if (err) {
            res.status(401).json({ success: false });
          } else {
            if (!!doc) {
              let nftData = await NftModel.findOneAndUpdate(
                { _id: assetId },
                {
                  listedForAuction: true,
                  nftOccupied: true,
                }
              );
              res.status(201).json({
                success: true,
                message: "Asset listed for auction successfully",
                auctionId: doc._id,
              });
            } else {
              res
                .status(401)
                .json({ success: false, message: "failed to list" });
            }
          }
        }
      );
    } else {
      res.status(401).json({ success: false, message: "Asset Occupied" });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.placebid = asyncHandler(async (req, res, next) => {
  try {
    const { amount, duration } = req.body;
    const { auctionId } = req.params;
    AuctionModel.findOneAndUpdate(
      { _id: auctionId },
      {
        $push: {
          bids: {
            auctionId,
            amount,
            duration,
            expireOn: addDays(new Date(), duration),
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
              .json({ success: true, message: "Bid successfully placed" });
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

exports.editAuction = asyncHandler(async (req, res, next) => {
  try {
    const { auctionId } = req.params;
    const { price, duration } = req.body;
    AuctionModel.findOneAndUpdate(
      { _id: auctionId },
      {
        baseAuctionPrice: price,
        duration,
      },
      null,
      (err, doc) => {
        if (err) {
          res.status(401).json({ success: false });
        } else {
          if (!!doc) {
            res.status(201).json({
              success: true,
              message: "Auction edited successfully",
            });
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

exports.fetchAuctionbyId = asyncHandler(async (req, res, next) => {
  try {
    const { auctionId } = req.params;
    let data = await AuctionModel.findOne({ _id: auctionId });
    if (data) {
      res.status(200).json({ success: true, data });
    } else {
      res.status(400).json({
        success: false,
        message: "No asset found with requested auctionId",
      });
    }
  } catch (err) {
    res.status(400).json({ success: false });
  }
});

exports.fetchAuctionByAsset = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    let data = await AuctionModel.findOne({ asset: assetId });
    if (data) {
      res.status(200).json({ success: true, data });
    } else {
      res.status(400).json({
        success: false,
        message: "No asset found with requested assetId",
      });
    }
  } catch (err) {
    res.status(400).json({ success: false });
  }
});
