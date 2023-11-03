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
const mixpanel = require("../services/mixpanel");
const { getRemoteIp } = require("../utils/utils");

exports.fixPriceListNft = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
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
            // $push: {
            //   history: {
            //     action: "Listed",
            //     user: id,
            //     amount: price,
            //   },
            // },
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
                await mixpanel.track("Asset listed", {
                  distinct_id: id,
                  asset: doc._id,
                  asset_name: doc.name,
                  asset_type: doc.assetType[0],
                  list_amount: price,
                  asset_token: doc.valueOfAsset.unit,
                  ip: remoteIp,
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
    const remoteIp = getRemoteIp(req);
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
            isOneTimeCommissionGiven: true,
            // $push: {
            //   history: {
            //     action: "bought",
            //     user: id,
            //     amount: data.listingPrice,
            //   },
            // },
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
                  await mixpanel.track("Asset sold", {
                    distinct_id: data.nftOwner,
                    asset: data._id,
                    asset_name: data.name,
                    asset_type: data.assetType[0],
                    asset_token: data.valueOfAsset.unit,
                    amount: data.listingPrice,
                    sold_by: data.nftOwner,
                    bought_by: id,
                    ip: remoteIp,
                  });
                  await mixpanel.track("Asset bought", {
                    distinct_id: id,
                    asset: data._id,
                    asset_name: data.name,
                    asset_type: data.assetType[0],
                    asset_token: data.valueOfAsset.unit,
                    sold_by: data.nftOwner,
                    amount: data.listingPrice,
                    bought_by: id,
                    ip: remoteIp,
                  });
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
    const remoteIp = getRemoteIp(req);
    const { assetId } = req.params;
    const { price, duration } = req.body;
    const { wallet_address, id } = req.user;
    let data = await NftModel.findOne({ _id: assetId });
    if (data.nftOwnerAddress === wallet_address) {
      if (data.state === "sale") {
        let obj = {
          state: "sale",
          listingPrice: price,
          $push: {
            history: {
              action: "Sale edited",
              user: id,
              amount: price,
            },
          },
        };
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
                // let activity = await UserActivityModel.create({
                //   userAddress: wallet_address,
                //   user: id,
                //   asset: doc._id,
                //   assetName: doc.name,
                //   assetCollection: doc.nftCollection,
                //   statusText: "Sale edited",
                // });
                await mixpanel.track("Asset listing updated", {
                  distinct_id: id,
                  asset: assetId,
                  asset_name: data.name,
                  asset_type: doc.assetType[0],
                  current_amount: doc.listingPrice,
                  updated_amount: price,
                  asset_token: doc.valueOfAsset.unit,
                  ip: remoteIp,
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
    const remoteIp = getRemoteIp(req);
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
            $push: {
              history: {
                action: "Sale Cancelled",
                user: id,
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
                  statusText: "Sale cancelled",
                });
                await mixpanel.track("Asset delisted", {
                  distinct_id: id,
                  asset: doc._id,
                  asset_name: doc.name,
                  list_amount: doc.listingPrice,
                  asset_type: doc.assetType[0],
                  asset_token: doc.valueOfAsset.unit,
                  ip: remoteIp,
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
    const remoteIp = getRemoteIp(req);
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
                        action: "NFT Listed on Auction",
                        user: id,
                        amount: price,
                      },
                    },
                  }
                );
                // let activity = await UserActivityModel.create({
                //   userAddress: wallet_address,
                //   user: id,
                //   asset: nftData._id,
                //   assetName: nftData.name,
                //   assetCollection: nftData.nftCollection,
                //   statusText: "NFT Listed on Auction",
                // });
                await mixpanel.track("Asset listed for auction", {
                  distinct_id: id,
                  asset: assetId,
                  asset_name: nftData.name,
                  asset_type: nftData.assetType[0],
                  list_amount: price,
                  asset_token: nftData.valueOfAsset.unit,
                  ip: remoteIp,
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
    const remoteIp = getRemoteIp(req);
    const { amount, bidId } = req.body;
    // const { amount, duration, bidId } = req.body;
    // const { auctionId } = req.params;
    const { wallet_address, id } = req.user;
    const { assetId } = req.params;
    let auctionData = await AuctionModel.findOne({
      asset: assetId,
      // status: "active",
      cancelled: false,
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
                    await mixpanel.track("Auction bid placed", {
                      distinct_id: id,
                      asset: data._id,
                      asset_name: data.name,
                      asset_type: data.assetType[0],
                      bid_amount: amount,
                      asset_token: data.valueOfAsset.unit,
                      ip: remoteIp,
                    });
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
                    await mixpanel.track("Auction bid placed", {
                      distinct_id: id,
                      asset: data._id,
                      asset_name: data.name,
                      asset_type: data.assetType[0],
                      bid_amount: amount,
                      asset_token: data.valueOfAsset.unit,
                      ip: remoteIp,
                    });
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
    const remoteIp = getRemoteIp(req);
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
                    $push: {
                      history: {
                        action: "Auction edited",
                        user: id,
                        amount: price,
                      },
                    },
                  }
                );
                // let activity = await UserActivityModel.create({
                //   userAddress: wallet_address,
                //   user: id,
                //   asset: doc._id,
                //   assetName: doc.name,
                //   assetCollection: doc.nftCollection,
                //   statusText: "Auction edited",
                // });
                await mixpanel.track("Auction edited", {
                  distinct_id: id,
                  asset: assetId,
                  ip: remoteIp,
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
    const remoteIp = getRemoteIp(req);
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    let auctionData = await AuctionModel.findOne({
      asset: assetId,
      // status: "active",
      cancelled: false,
    });
    if (auctionData) {
      let data = await NftModel.findOne({ _id: assetId });
      if (data.nftOwnerAddress === wallet_address) {
        if (data.state === "auction") {
          AuctionModel.findOneAndUpdate(
            { _id: auctionData._id },
            { cancelled: true },
            null,
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
                    asset: nftData._id,
                    assetName: nftData.name,
                    assetCollection: nftData.nftCollection,
                    statusText: "Auction Cancelled",
                  });
                  if (nftData) {
                    if (auctionData.status === "active") {
                      for (let i = 0; i < doc.bids.length; i++) {
                        if (doc.bids[i].status === "none") {
                          let notification = await NotificationModel.create({
                            nft: doc.asset,
                            category: "bid-rejected",
                            user: doc.bids[i].bidder,
                            amount: doc.bids[i].amount,
                            bidId: doc.bids[i].bidId,
                            auctionId: doc._id,
                            saleId: doc.saleId,
                          });
                        }
                      }
                    }
                    await mixpanel.track("Auction cancelled", {
                      distinct_id: id,
                      asset: assetId,
                      ip: remoteIp,
                    });
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
    } else {
      res.status(400).json({
        success: false,
        message: "Auction has expired",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.acceptBid = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
    const { assetId } = req.params;
    const { bidId } = req.body;
    const { wallet_address, id } = req.user;
    let auctionData = await AuctionModel.findOne({
      asset: assetId,
      // status: "active",
      cancelled: false,
    });
    // if (auctionData.status === "active") {
    if (auctionData.auctionOwnerAddress === wallet_address) {
      let bid = auctionData.bids.filter((item) => item.bidId === bidId);
      if (
        // isBefore(
        //   new Date(),
        //   addDays(auctionData.createdAt, auctionData.duration)
        // ) &&
        bid[0].status === "none"
      ) {
        let data = await AuctionModel.findOneAndUpdate(
          // { "bids.bidId": bidId },
          { _id: auctionData._id, "bids.bidId": bidId },
          {
            $set: {
              "bids.$.status": "accepted",
              status: "inactive",
            },
            cancelled: true,
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
              isOneTimeCommissionGiven: true,
            }
          );
          if (nftData) {
            // let activity = await UserActivityModel.insertMany([
            //   {
            //     userAddress: wallet_address,
            //     user: id,
            //     asset: nftData._id,
            //     assetName: nftData.name,
            //     assetCollection: nftData.nftCollection,
            //     statusText: "Accepted Bid",
            //   },
            //   {
            //     userAddress: bid[0].bidderAddress,
            //     user: bid[0].bidder,
            //     asset: nftData._id,
            //     assetName: nftData.name,
            //     assetCollection: nftData.nftCollection,
            //     statusText: "Bid got accepted",
            //   },
            // ]);
            let notification = await NotificationModel.create({
              nft: nftData._id,
              category: "accepted-bid",
              user: bid[0].bidder,
              amount: bid[0].amount,
            });
            let notification2 = await NotificationModel.findOneAndDelete({
              nft: nftData._id,
              category: "bid-rejected",
              bidId,
              saleId: auctionData.saleId,
            });
            if (notification) {
              if (auctionData.status === "active") {
                for (let i = 0; i < data.bids.length; i++) {
                  if (data.bids[i].status === "none") {
                    let notification2 = await NotificationModel.create({
                      nft: data.asset,
                      category: "bid-rejected",
                      user: data.bids[i].bidder,
                      amount: data.bids[i].amount,
                      bidId: data.bids[i].bidId,
                      auctionId: auctionData._id,
                      saleId: auctionData.saleId,
                    });
                  }
                }
              }
              await mixpanel.track("Auction bid accepted", {
                distinct_id: id,
                asset: assetId,
                bidder: bid[0].bidder,
                amount: bid[0].amount,
                asset_type: nftData.assetType[0],
                asset_token: nftData.valueOfAsset.unit,
                ip: remoteIp,
              });
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
    // } else {
    //   res.status(401).json({ success: false, message: "Auction is closed" });
    // }
  } catch (err) {
    res.status(401).json({ success: false, message: "Auction is closed" });
  }
});

exports.rejectBid = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
    const { assetId } = req.params;
    const { bidId } = req.body;
    const { wallet_address, id } = req.user;
    let auctionData = await AuctionModel.findOne({
      asset: assetId,
      // status: "active",
      cancelled: false,
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
            bidId: bid[0].bidId,
            auctionId: auctionData._id,
            saleId: data.saleId,
          });
          if (notification) {
            await mixpanel.track("Auction bid rejected", {
              distinct_id: id,
              asset: data._id,
              bidder: bid[0].bidder,
              amount: bid[0].amount,
              bidId: bid[0].bidId,
              auctionId: auctionData._id,
              saleId: data.saleId,
              ip: remoteIp,
            });
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
    const remoteIp = getRemoteIp(req);
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
              await mixpanel.track("Auction bid withdrawn", {
                distinct_id: id,
                asset: data.asset,
                bidId,
                auctionId,
                ip: remoteIp,
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
      // status: "active",
      cancelled: false,
    }).populate([
      // {
      //   path: "auctionOwner",
      //   select: userSelectQuery,
      // },
      {
        path: "bids.bidder",
        select: "_id profileImage name wallet_address",
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

    const { sortby, search, type, blockchain, validation } = req.query;

    let queryStr = {
      state: "sale",
    };

    if (search) {
      queryStr = { ...queryStr, name: { $regex: search, $options: "i" } };
    }

    if (blockchain) {
      queryStr = { ...queryStr, blockchain: { $in: blockchain.split(",") } };
    }

    if (type) {
      queryStr = { ...queryStr, assetType: { $in: type.split(",") } };
    }

    if (validation) {
      queryStr = {
        ...queryStr,
        validationState: { $in: validation.split(",") },
      };
    }

    query = NftModel.find(queryStr)
      .populate([
        // {
        //   path: "nftCollection",
        //   select: collectionSelectQuery,
        // },
        { path: "nftOwner", select: "_id name profileImage kycEventType" },
        // { path: "nftCreator", select: userSelectQuery },
        { path: "validator", select: "_id name profileImage kybEventType" },
        // {
        //   path: "history.user",
        //   select: userHistorySelectQuery,
        // },
        // {
        //   path: "history.validator",
        //   select: validatorHistorySelectQuery,
        // },
      ])
      .select(
        "_id name validationState nftOwner nftOwnerType validator mediaLinks state listingPrice listingDate listingDuration"
      );

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
      totalCount: total,
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

    const { sortby, search, type, blockchain, validation } = req.query;

    let queryStr = {
      state: "auction",
    };

    if (search) {
      queryStr = { ...queryStr, name: { $regex: search, $options: "i" } };
    }

    if (blockchain) {
      queryStr = { ...queryStr, blockchain: { $in: blockchain.split(",") } };
    }

    if (type) {
      queryStr = { ...queryStr, assetType: { $in: type.split(",") } };
    }

    if (validation) {
      queryStr = {
        ...queryStr,
        validationState: { $in: validation.split(",") },
      };
    }

    query = NftModel.find(queryStr)
      .populate([
        // {
        //   path: "nftCollection",
        //   select: collectionSelectQuery,
        // },
        { path: "nftOwner", select: "_id name profileImage kycEventType" },
        // { path: "nftCreator", select: userSelectQuery },
        { path: "validator", select: "_id name profileImage kybEventType" },
        // {
        //   path: "history.user",
        //   select: userHistorySelectQuery,
        // },
        // {
        //   path: "history.validator",
        //   select: validatorHistorySelectQuery,
        // },
      ])
      .select(
        "_id name validationState nftOwner nftOwnerType validator mediaLinks state listingPrice listingDate listingDuration"
      );

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
      totalCount: total,
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
