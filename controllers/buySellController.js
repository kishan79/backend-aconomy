const asyncHandler = require("../middlewares/async");
const NftModel = require("../models/NFT");
const UserActivityModel = require("../models/UserActivity");
const AuctionModel = require("../models/Auction");
const NotificationModel = require("../models/Notification");
const { addDays, isBefore } = require("date-fns");
const {
  nftSelectQuery,
  collectionSelectQuery,
  userSelectQuery,
  validatorSelectQuery,
  userHistorySelectQuery,
  validatorHistorySelectQuery,
} = require("../utils/selectQuery");

exports.fixPriceListNft = asyncHandler(async (req, res, next) => {
  try {
    const { price, duration, saleId, contractAddress } = req.body;
    const { assetId } = req.params;
    const { id, wallet_address } = req.user;
    let data = await NftModel.findOne({ _id: assetId });
    if (data.nftOwnerAddress === wallet_address) {
      if (data.state === "none") {
        NftModel.findOneAndUpdate(
          { _id: assetId },
          {
            listingPrice: price,
            state: "sale",
            listingDate: new Date(),
            listingDuration: duration,
            saleId,
            nftContractAddress: contractAddress,
            $push: {
              history: {
                action: "Listed",
                user: id,
                amount: price,
              },
            },
          },
          null,
          async (err, doc) => {
            if (err) {
              res.status(401).json({ success: false });
            } else {
              if (!!doc) {
                let activity = await UserActivityModel.create({
                  userAddress: wallet_address,
                  user: id,
                  asset: doc._id,
                  assetName: doc.name,
                  assetCollection: doc.nftCollection,
                  statusText: "NFT Listed",
                });
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
      if (data.state === "sale") {
        NftModel.findOneAndUpdate(
          { _id: assetId },
          {
            nftOwnerAddress: wallet_address,
            nftOwner: id,
            listingPrice: null,
            state: "none",
            listingDate: null,
            listingDuration: null,
            $push: {
              history: {
                action: "bought",
                user: id,
                amount: data.listingPrice,
              },
            },
          },
          null,
          async (err, doc) => {
            if (err) {
              res.status(401).json({ success: false });
            } else {
              if (!!doc) {
                let activity = await UserActivityModel.insertMany([
                  {
                    userAddress: wallet_address,
                    user: id,
                    asset: doc._id,
                    assetName: doc.name,
                    assetCollection: doc.nftCollection,
                    statusText: "Bought",
                  },
                  {
                    userAddress: data.nftOwnerAddress,
                    user: data.nftOwner,
                    asset: doc._id,
                    assetName: doc.name,
                    assetCollection: doc.nftCollection,
                    statusText: "Sold",
                  },
                ]);
                let notification = await NotificationModel.insertMany([
                  {
                    nft: data._id,
                    category: "nft-sold",
                    user: data.nftOwner,
                    amount: data.listingPrice,
                  },
                  {
                    nft: data._id,
                    category: "nft-bought",
                    user: data.id,
                    amount: data.listingPrice,
                  },
                ]);
                if (notification) {
                  res.status(201).json({
                    success: true,
                    message: "Asset bought successfully",
                  });
                }
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
    const { wallet_address, id } = req.user;
    let data = await NftModel.findOne({ _id: assetId });
    if (data.nftOwnerAddress === wallet_address) {
      if (data.state === "sale") {
        let obj = { state: "sale", listingPrice: price };
        if (duration) {
          obj = { ...obj, listingDuration: duration };
        }
        NftModel.findOneAndUpdate(
          { _id: assetId },
          obj,
          null,
          async (err, doc) => {
            if (err) {
              res.status(401).json({ success: false });
            } else {
              if (!!doc) {
                let activity = await UserActivityModel.create({
                  userAddress: wallet_address,
                  user: id,
                  asset: doc._id,
                  assetName: doc.name,
                  assetCollection: doc.nftCollection,
                  statusText: "Sale edited",
                });
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

exports.cancelFixedPriceSale = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    let data = await NftModel.findOne({ _id: assetId });
    if (data.nftOwnerAddress === wallet_address) {
      if (data.state === "sale") {
        NftModel.findOneAndUpdate(
          { _id: assetId },
          {
            listingPrice: null,
            state: "none",
            listingDuration: null,
          },
          null,
          async (err, doc) => {
            if (err) {
              res.status(401).json({ success: false });
            } else {
              if (!!doc) {
                let activity = await UserActivityModel.create({
                  userAddress: wallet_address,
                  user: id,
                  asset: doc._id,
                  assetName: doc.name,
                  assetCollection: doc.nftCollection,
                  statusText: "Sale cancelled",
                });
                res.status(201).json({
                  success: true,
                  message: "Asset sale cancelled successfully",
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
        message: "Only asset owner can cancel the sale",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.listNftForAuction = asyncHandler(async (req, res, next) => {
  try {
    const { id, wallet_address } = req.user;
    const { duration, price, saleId, contractAddress } = req.body;
    const { assetId } = req.params;
    let data = await NftModel.findOne({ _id: assetId });
    if (data.nftOwnerAddress === wallet_address) {
      if (data.state === "none") {
        AuctionModel.create(
          {
            auctionOwner: id,
            auctionOwnerAddress: wallet_address,
            asset: assetId,
            saleId,
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
                    state: "auction",
                    listingPrice: price,
                    listingDate: new Date(),
                    listingDuration: duration,
                    saleId,
                    nftContractAddress: contractAddress,
                    $push: {
                      history: {
                        action: "Listed for auction",
                        user: id,
                        amount: price,
                      },
                    },
                  }
                );
                let activity = await UserActivityModel.create({
                  userAddress: wallet_address,
                  user: id,
                  asset: nftData._id,
                  assetName: nftData.name,
                  assetCollection: nftData.nftCollection,
                  statusText: "NFT Listed on Auction",
                });
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
    const { amount, bidId } = req.body;
    // const { amount, duration, bidId } = req.body;
    // const { auctionId } = req.params;
    const { wallet_address, id } = req.user;
    const { assetId } = req.params;
    let auctionData = await AuctionModel.findOne({
      asset: assetId,
      status: "active",
    });
    let data = await NftModel.findOne({ _id: assetId });
    if (data.nftOwnerAddress !== wallet_address) {
      if (data.state === "auction") {
        if (
          auctionData.bids.length &&
          amount >= auctionData.bids[auctionData.bids.length - 1].amount
        ) {
          AuctionModel.findOneAndUpdate(
            { _id: auctionData._id },
            {
              $push: {
                bids: {
                  auctionId: auctionData._id,
                  bidderAddress: wallet_address,
                  bidder: id,
                  bidId,
                  amount,
                  // duration,
                  // expireOn: addDays(new Date(), duration),
                },
              },
            },
            null,
            async (err, doc) => {
              if (err) {
                res.status(401).json({ success: false });
              } else {
                if (!!doc) {
                  let activity = await UserActivityModel.create({
                    userAddress: wallet_address,
                    user: id,
                    asset: data._id,
                    assetName: data.name,
                    assetCollection: data.nftCollection,
                    statusText: "Bid Placed",
                  });
                  let notification = await NotificationModel.create({
                    nft: data._id,
                    category: "bid-placed",
                    user: data.nftOwner,
                    amount,
                  });
                  if (notification) {
                    res.status(201).json({
                      success: true,
                      message: "Bid successfully placed",
                    });
                  }
                } else {
                  res.status(401).json({ success: false });
                }
              }
            }
          );
        } else if (amount >= auctionData.baseAuctionPrice) {
          AuctionModel.findOneAndUpdate(
            { _id: auctionData._id },
            {
              $push: {
                bids: {
                  auctionId: auctionData._id,
                  bidderAddress: wallet_address,
                  bidder: id,
                  bidId,
                  amount,
                  // duration,
                  // expireOn: addDays(new Date(), duration),
                },
              },
            },
            null,
            async (err, doc) => {
              if (err) {
                res.status(401).json({ success: false });
              } else {
                if (!!doc) {
                  let activity = await UserActivityModel.create({
                    userAddress: wallet_address,
                    user: id,
                    asset: data._id,
                    assetName: data.name,
                    assetCollection: data.nftCollection,
                    statusText: "Bid Placed",
                  });
                  let notification = await NotificationModel.create({
                    nft: data._id,
                    category: "bid-placed",
                    user: data.nftOwner,
                    amount,
                  });
                  if (notification) {
                    res.status(201).json({
                      success: true,
                      message: "Bid successfully placed",
                    });
                  }
                } else {
                  res.status(401).json({ success: false });
                }
              }
            }
          );
        } else {
          res.status(401).json({
            success: false,
            message:
              "Amount must be greater than the base auction amount and the last bid ",
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
    const { wallet_address, id } = req.user;
    let auctionData = await AuctionModel.findOne({
      asset: assetId,
      status: "active",
    });
    let data = await NftModel.findOne({ _id: assetId });
    if (data.nftOwnerAddress === wallet_address) {
      if (data.state === "auction") {
        AuctionModel.findOneAndUpdate(
          { _id: auctionData._id },
          {
            baseAuctionPrice: price,
            duration,
          },
          null,
          async (err, doc) => {
            if (err) {
              res.status(401).json({ success: false });
            } else {
              if (!!doc) {
                let nftData = await NftModel.findOneAndUpdate(
                  { _id: assetId },
                  {
                    listingPrice: price,
                    listingDuration: duration,
                  }
                );
                let activity = await UserActivityModel.create({
                  userAddress: wallet_address,
                  user: id,
                  asset: doc._id,
                  assetName: doc.name,
                  assetCollection: doc.nftCollection,
                  statusText: "Auction edited",
                });
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

exports.cancelAuction = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    let auctionData = await AuctionModel.findOne({
      asset: assetId,
      status: "active",
    });
    let data = await NftModel.findOne({ _id: assetId });
    if (data.nftOwnerAddress === wallet_address) {
      if (data.state === "auction") {
        AuctionModel.findOneAndDelete(
          { _id: auctionData._id },
          async (err, doc) => {
            if (err) {
              res.status(401).json({ success: false });
            } else {
              if (!!doc) {
                let nftData = await NftModel.findOneAndUpdate(
                  { _id: assetId },
                  {
                    state: "none",
                    listingPrice: null,
                    listingDate: null,
                    listingDuration: null,
                    $push: {
                      history: {
                        action: "Auction cancelled",
                        user: id,
                      },
                    },
                  }
                );
                let activity = await UserActivityModel.create({
                  userAddress: wallet_address,
                  user: id,
                  asset: doc._id,
                  assetName: doc.name,
                  assetCollection: doc.nftCollection,
                  statusText: "Auction Cancelled",
                });
                if (nftData) {
                  res.status(201).json({
                    success: true,
                    message: "Auction cancelled successfully",
                  });
                } else {
                  res.status(401).json({
                    success: false,
                    message: "Failed to cancel auction",
                  });
                }
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
        message: "Only owner can cancel auction",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.acceptBid = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { bidId } = req.body;
    const { wallet_address, id } = req.user;
    let auctionData = await AuctionModel.findOne({
      asset: assetId,
      status: "active",
    });
    if (auctionData.status === "active") {
      if (auctionData.auctionOwnerAddress === wallet_address) {
        let bid = auctionData.bids.filter((item) => item.bidId === bidId);
        if (
          isBefore(
            new Date(),
            addDays(auctionData.createdAt, auctionData.duration)
          )
        ) {
          let data = await AuctionModel.findOneAndUpdate(
            // { "bids.bidId": bidId },
            { _id: auctionData._id, "bids.bidId": bidId },
            {
              $set: {
                "bids.$.status": "accepted",
                status: "inactive",
              },
            },
            {
              new: true,
            }
          );
          if (data) {
            let nftData = await NftModel.findOneAndUpdate(
              { _id: assetId },
              {
                state: "none",
                nftOwnerAddress: bid[0].bidderAddress,
                nftOwner: bid[0].bidder,
              }
            );
            if (nftData) {
              let activity = await UserActivityModel.insertMany([
                {
                  userAddress: wallet_address,
                  user: id,
                  asset: nftData._id,
                  assetName: nftData.name,
                  assetCollection: nftData.nftCollection,
                  statusText: "Accepted Bid",
                },
                {
                  userAddress: bid[0].bidderAddress,
                  user: bid[0].bidder,
                  asset: nftData._id,
                  assetName: nftData.name,
                  assetCollection: nftData.nftCollection,
                  statusText: "Bid got accepted",
                },
              ]);
              let notification = await NotificationModel.create({
                nft: nftData._id,
                category: "accepted-bid",
                user: bid[0].bidder,
                amount: bid[0].amount,
              });
              if (notification) {
                for (let i = 0; i < data.bids.length; i++) {
                  if (data.bids[i].status === "none") {
                    let notification2 = await NotificationModel.create({
                      nft: data.asset,
                      category: "bid-rejected",
                      user: data.bids[i].bidder,
                      amount: data.bids[i].amount,
                    });
                  }
                }
                res.status(201).json({
                  success: true,
                  message: "Bid accepted successfully",
                });
              }
            } else {
              res
                .status(401)
                .json({ success: false, message: "Failed to accept the bid" });
            }
          } else {
            res
              .status(401)
              .json({ success: false, message: "Failed to accept the bid" });
          }
        } else {
          res.status(401).json({ success: false, message: "Bid is expired" });
        }
      } else {
        res.status(401).json({
          success: false,
          message: "Only Asset owner can accept the bid",
        });
      }
    } else {
      res.status(401).json({ success: false, message: "Auction is closed" });
    }
  } catch (err) {
    res.status(401).json({ success: false, message: "Auction is closed" });
  }
});

exports.rejectBid = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { bidId } = req.body;
    const { wallet_address, id } = req.user;
    let auctionData = await AuctionModel.findOne({
      asset: assetId,
      status: "active",
    });
    if (auctionData.status === "active") {
      if (auctionData.auctionOwnerAddress === wallet_address) {
        let bid = auctionData.bids.filter((item) => item.bidId === bidId);
        // if (
        //   isBefore(
        //     new Date(),
        //     addDays(auctionData.createdAt, auctionData.duration)
        //   )
        // ) {
        let data = await AuctionModel.findOneAndUpdate(
          // { "bids.bidId": bidId },
          { _id: auctionData._id, "bids.bidId": bidId },
          {
            $set: {
              "bids.$.status": "rejected",
            },
          },
          {
            new: true,
          }
        );
        if (data) {
          let notification = await NotificationModel.create({
            nft: data.asset,
            category: "bid-rejected",
            user: bid[0].bidder,
            amount: bid[0].amount,
          });
          if (notification) {
            res.status(201).json({
              success: true,
              message: "Bid rejected successfully",
            });
          }
        } else {
          res
            .status(401)
            .json({ success: false, message: "Failed to accept the bid" });
        }
        // } else {
        //   res.status(401).json({ success: false, message: "Bid is expired" });
        // }
      } else {
        res.status(401).json({
          success: false,
          message: "Only Asset owner can reject the bid",
        });
      }
    } else {
      res.status(401).json({ success: false, message: "Auction is closed" });
    }
  } catch (err) {
    res.status(401).json({ success: false, message: "Auction is closed" });
  }
});

exports.withdrawBid = asyncHandler(async (req, res, next) => {
  try {
    const { auctionId, bidId } = req.body;
    const { wallet_address, id } = req.user;
    let auctionData = await AuctionModel.findOne({
      _id: auctionId,
    });
    let bid = auctionData.bids.filter((item) => item.bidId === bidId);
    let highestBid = auctionData.bids[auctionData.bids.length - 1];
    if (auctionData.auctionOwnerAddress !== wallet_address) {
      if (
        bid[0].bidderAddress === wallet_address &&
        bid[0].status !== "accepted"
      ) {
        if (
          auctionData.status === "active" &&
          bid[0].bidId === highestBid.bidId
        ) {
          res.status(401).json({
            success: false,
            message:
              "Highest bid can't be withdrawn when the auction is active",
          });
        } else {
          if (bid[0].status !== "accepted" && bid[0].status !== "withdrawn") {
            let data = await AuctionModel.findOneAndUpdate(
              {
                _id: auctionId,
                "bids.bidId": bidId,
              },
              {
                $set: {
                  "bids.$.status": "withdrawn",
                },
              }
            );
            if (data) {
              let activity = await UserActivityModel.create({
                userAddress: wallet_address,
                user: id,
                asset: data.asset,
                // assetName: data.name,
                statusText: "Bid withdrawn",
              });
              res
                .status(201)
                .json({ success: true, message: "Bid successfully withdrawn" });
            } else {
              res
                .status(401)
                .json({ success: false, message: "Bid failed to withdraw" });
            }
          } else {
            res.status(401).json({
              success: false,
              message: "Bid already accepted or withdrawn",
            });
          }
        }
      } else {
        res.status(401).json({
          success: false,
          message: "Bidder can't withdrawn the accepted bid",
        });
      }
    } else {
      res
        .status(401)
        .json({ success: false, message: "Auction owner can't withdraw bid" });
    }
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

exports.fetchAllAuctionsByAsset = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    let data = await AuctionModel.find({ asset: assetId }).populate([
      {
        path: "auctionOwner",
        select: userSelectQuery,
      },
      {
        path: "bids.bidder",
        select: userSelectQuery,
      },
    ]);
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

exports.fetchLastestAuctionByAsset = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    let data = await AuctionModel.findOne({
      asset: assetId,
      status: "active",
    }).populate([
      {
        path: "auctionOwner",
        select: userSelectQuery,
      },
      {
        path: "bids.bidder",
        select: userSelectQuery,
      },
    ]);
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

exports.fetchAllListedNfts = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby } = req.query;

    let queryStr = {
      state: "sale",
    };

    query = NftModel.find(queryStr)
      .populate([
        {
          path: "nftCollection",
          select: collectionSelectQuery,
        },
        { path: "nftOwner", select: userSelectQuery },
        { path: "nftCreator", select: userSelectQuery },
        { path: "validator", select: validatorSelectQuery },
        {
          path: "history.user",
          select: userHistorySelectQuery,
        },
        {
          path: "history.validator",
          select: validatorHistorySelectQuery,
        },
      ])
      .select(nftSelectQuery);

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
    const total = await NftModel.countDocuments(queryStr);
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

exports.fetchAllAuctionListedNfts = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby } = req.query;

    let queryStr = {
      state: "auction",
    };

    query = NftModel.find(queryStr)
      .populate([
        {
          path: "nftCollection",
          select: collectionSelectQuery,
        },
        { path: "nftOwner", select: userSelectQuery },
        { path: "nftCreator", select: userSelectQuery },
        { path: "validator", select: validatorSelectQuery },
        {
          path: "history.user",
          select: userHistorySelectQuery,
        },
        {
          path: "history.validator",
          select: validatorHistorySelectQuery,
        },
      ])
      .select(nftSelectQuery);

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
    const total = await NftModel.countDocuments(queryStr);
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
