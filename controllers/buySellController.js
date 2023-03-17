const asyncHandler = require("../middlewares/async");
const NftModel = require("../models/NFT");
const AuctionModel = require("../models/Auction");
const { addDays } = require("date-fns");

exports.fixPriceListNft = asyncHandler(async (req, res, next) => {
  try {
    const { price, duration, saleId } = req.body;
    const { assetId } = req.params;
    const { id } = req.user;
    let data = await NftModel.findOne({ _id: assetId });
    if (data.nftOwnerAddress === wallet_address) {
      if (!data.listedOnMarketplace || !data.nftOccupied) {
        NftModel.findOneAndUpdate(
          { _id: assetId },
          {
            listingPrice: price,
            listedOnMarketplace: true,
            nftOccupied: true,
            listingDate: new Date(),
            listingDuration: duration,
            saleId,
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
                res.status(201).json({
                  success: true,
                  message: "Asset listed successfully",
                });
              } else {
                res.status(401).json({ success: false });
              }
            }
          }
        );
      } else {
        res.status(401).json({ success: false, message: "Asset Occupied" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only owner can list asset for sale",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.buyNft = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { id, wallet_address } = req.user;
    let data = await NftModel.findOne({ _id: assetId });
    if (data.nftOwnerAddress !== wallet_address) {
      if (data.listedOnMarketplace && data.nftOccupied) {
        NftModel.findOneAndUpdate(
          { _id: assetId },
          {
            nftOwnerAddress: wallet_address,
            nftOwner: id,
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
                res.status(201).json({
                  success: true,
                  message: "Asset bought successfully",
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
    } else {
      res
        .status(401)
        .json({ success: false, message: "Owner cannot buy the asset" });
    }
  } catch (err) {
    res.status(401).json({ success: false, err });
  }
});

exports.editFixedPriceSale = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { price, duration } = req.body;
    const { wallet_address } = req.user;
    let data = await NftModel.findOne({ _id: assetId });
    if (data.nftOwnerAddress === wallet_address) {
      if (data.listedOnMarketplace && data.nftOccupied) {
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
    } else {
      res.status(401).json({
        success: false,
        message: "Only asset owner can edit the sale",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.listNftForAuction = asyncHandler(async (req, res, next) => {
  try {
    const { id, wallet_address } = req.user;
    const { duration, price } = req.body;
    const { assetId } = req.params;
    let data = await NftModel.findOne({ _id: assetId });
    if (data.nftOwnerAddress === wallet_address) {
      if (!data.listedForAuction || !data.nftOccupied) {
        AuctionModel.create(
          {
            auctionOwner: id,
            auctionOwnerAddress: wallet_address,
            asset: assetId,
            duration,
            baseAuctionPrice: price,
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
    } else {
      res.status(401).json({
        success: false,
        message: "Only owner can list asset for auction",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.placeBid = asyncHandler(async (req, res, next) => {
  try {
    const { amount, duration } = req.body;
    // const { auctionId } = req.params;
    const {wallet_address} = req.user;
    const {assetId} = req.params;
    let auctionData = await AuctionModel.findOne({ asset: assetId, status:"active"});
    let data = await NftModel.findOne({ _id: assetId });
    if (data.nftOwnerAddress !== wallet_address) {
      if (data.listedForAuction && data.nftOccupied) {
        if (amount > auctionData.baseAuctionPrice) {
          AuctionModel.findOneAndUpdate(
            { _id: auctionData._id },
            {
              $push: {
                bids: {
                  auctionId: auctionData._id,
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
                  res.status(201).json({
                    success: true,
                    message: "Bid successfully placed",
                  });
                } else {
                  res.status(401).json({ success: false });
                }
              }
            }
          );
        } else {
          res.status(401).json({
            success: false,
            message: "Amount must be greater than the base auction amount",
          });
        }
      } else {
        res
          .status(401)
          .json({ success: false, message: "Asset not listed for auction" });
      }
    } else {
      res
        .status(401)
        .json({ success: false, message: "Asset owner cannot place a bid" });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.editAuction = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { price, duration } = req.body;
    const { wallet_address } = req.user;
    let auctionData = await AuctionModel.findOne({ asset: assetId, status:"active"});
    let data = await NftModel.findOne({ _id: assetId });
    if (data.nftOwnerAddress === wallet_address) {
      if (data.listedForAuction && data.nftOccupied) {
        AuctionModel.findOneAndUpdate(
          { _id: auctionData._id },
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
      } else {
        res
          .status(401)
          .json({ success: false, message: "Asset not listed for auction" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only owner can edit auction",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.acceptBid = asyncHandler(async (req, res, next) => {
  try {
    
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
    let data = await AuctionModel.find({ asset: assetId });
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
