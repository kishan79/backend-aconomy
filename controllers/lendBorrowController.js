const asyncHandler = require("../middlewares/async");
const NftModel = require("../models/NFT");
const UserActivityModel = require("../models/UserActivity");
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

exports.proposeOffer = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    const { price, apy, duration, expiration, nftId, contractAddress } =
      req.body;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress === wallet_address) {
      if (nftData.state === "none") {
        let data = await NftModel.findOneAndUpdate(
          { _id: assetId },
          {
            state: "lendborrow",
            lendBorrowOffer: {
              price,
              apy,
              duration,
              expiration,
              bidid: null,
              nftId,
              nftContractAddress: contractAddress,
              createdAt: new Date(),
            },
          }
        );
        if (data) {
          let activity = await UserActivityModel.create({
            userAddress: wallet_address,
            user: id,
            asset: nftData._id,
            assetName: nftData.name,
            assetCollection: nftData.nftCollection,
            statusText: "Proposed an offer",
          });
          await mixpanel.track("Propose asset borrow offer", {
            distinct_id: id,
            asset: assetId,
            asset_name: nftData.name,
            asset_type: nftData.assetType[0],
            borrow_price: price,
            asset_token: nftData.valueOfAsset.unit,
            ip: remoteIp,
          });
          res
            .status(201)
            .json({ success: true, message: "Offer proposed successfully" });
        } else {
          res
            .status(401)
            .json({ success: false, message: "Failed to propose an offer" });
        }
      } else {
        res.status(401).json({ success: false, message: "Action forbidden" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only asset owner can propose an offer",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.removefromBorrow = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress === wallet_address) {
      if (nftData.state === "lendborrow") {
        let data = await NftModel.findOneAndUpdate(
          { _id: assetId },
          {
            state: "none",
            lendBorrowOffer: {},
          }
        );
        if (data) {
          for (let i = 0; i < nftData.lendBorrowOffers.length; i++) {
            if (nftData.lendBorrowOffers[i].status === "none") {
              let notification2 = await NotificationModel.create({
                nft: nftData._id,
                category: "lend-offer-reject",
                user: nftData.lendBorrowOffers[i].bidder,
                tokenId: nftData.tokenId,
                bidId: nftData.lendBorrowOffers[i].bidId,
              });
            }
          }
          // let activity = await UserActivityModel.create({
          //   userAddress: wallet_address,
          //   user: id,
          //   asset: nftData._id,
          //   assetName: nftData.name,
          //   assetCollection: nftData.nftCollection,
          //   statusText: "Remove an offer",
          // });
          await mixpanel.track("Removed from borrow", {
            distinct_id: id,
            asset: assetId,
            asset_name: nftData.name,
            borrow_price: Object.keys(data.lendBorrowOffer).length
              ? data.lendBorrowOffer.price
              : null,
            asset_type: nftData.assetType[0],
            asset_token: nftData.valueOfAsset.unit,
            ip: remoteIp,
          });
          res.status(201).json({
            success: true,
            message: "Offer removed from borrow successfully",
          });
        } else {
          res
            .status(401)
            .json({ success: false, message: "Failed to remove from borrow" });
        }
      } else {
        res.status(401).json({ success: false, message: "Action forbidden" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only asset owner can remove from borrow",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.makeOffer = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    const { price, apy, duration, expiration, bidId, erc20Address } = req.body;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress !== wallet_address) {
      if (nftData.state === "lendborrow") {
        let data = await NftModel.findOneAndUpdate(
          { _id: assetId },
          {
            $push: {
              lendBorrowOffers: {
                price,
                apy,
                duration,
                expiration,
                bidId,
                expireOn: addDays(new Date(), expiration),
                bidder: id,
                bidderAddress: wallet_address,
                erc20Address,
              },
            },
          }
        );
        if (data) {
          let activity = await UserActivityModel.create({
            userAddress: wallet_address,
            user: id,
            asset: nftData._id,
            assetName: nftData.name,
            assetCollection: nftData.nftCollection,
            statusText: "Made an offer",
          });
          let notification = await NotificationModel.create({
            nft: nftData._id,
            category: "lend-make-offer",
            user: nftData.nftOwner,
            amount: price,
          });
          if (notification) {
            await mixpanel.track("Made offer for lend", {
              distinct_id: id,
              asset: assetId,
              lend_amount: price,
              asset_token: data.valueOfAsset.unit,
              ip: remoteIp,
            });
            res
              .status(201)
              .json({ success: true, message: "Offer made successfully" });
          }
        } else {
          res
            .status(401)
            .json({ success: false, message: "Failed to make an offer" });
        }
      } else {
        res.status(401).json({ success: false, message: "Action forbidden" });
      }
    } else {
      res
        .status(401)
        .json({ success: false, message: "Asset owner can't make an offer" });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.acceptOffer = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
    const { assetId } = req.params;
    const { bidId } = req.body;
    const { wallet_address, id } = req.user;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress === wallet_address) {
      if (nftData.state === "lendborrow") {
        let bid = nftData.lendBorrowOffers.filter(
          (item) => item.bidId === bidId
        );
        if (isBefore(new Date(), bid[0].expireOn)) {
          let data = await NftModel.findOneAndUpdate(
            { _id: assetId, "lendBorrowOffers.bidId": bidId },
            {
              $set: {
                "lendBorrowOffers.$.status": "accepted",
                lendBorrowOffer: {
                  price: bid[0].price,
                  apy: bid[0].apy,
                  duration: bid[0].duration,
                  expiration: bid[0].expiration,
                  bidId: bid[0].bidId,
                  bidderAddress: bid[0].bidderAddress,
                  bidder: bid[0].bidder,
                  nftId: nftData.lendBorrowOffer.nftId,
                  nftContractAddress:
                    nftData.lendBorrowOffer.nftContractAddress,
                  createdAt: bid[0].createdAt,
                },
                borrowState: "active",
              },
              $push: {
                history: {
                  action: "Accepted an offer",
                  user: id,
                },
              },
            },
            {
              new: true,
            }
          );
          if (data) {
            // let activity = await UserActivityModel.create({
            //   userAddress: wallet_address,
            //   user: id,
            //   asset: nftData._id,
            //   assetName: nftData.name,
            //   assetCollection: nftData.nftCollection,
            //   statusText: "Accepted an offer",
            // });
            let notification = await NotificationModel.create({
              nft: nftData._id,
              category: "lend-offer-accept",
              user: bid[0].bidder,
            });
            if (notification) {
              for (let i = 0; i < data.lendBorrowOffers.length; i++) {
                if (data.lendBorrowOffers[i].status === "none") {
                  let notification2 = await NotificationModel.create({
                    nft: nftData._id,
                    category: "lend-offer-declined",
                    user: data.lendBorrowOffers[i].bidder,
                    tokenId: nftData.tokenId,
                    bidId: data.lendBorrowOffers[i].bidId,
                  });
                }
              }
              await mixpanel.track("Accept lend offer", {
                distinct_id: id,
                asset: assetId,
                bidId,
                bidder: bid[0].bidder,
                lend_amount: bid[0].price,
                asset_type: data.assetType[0],
                asset_token: data.valueOfAsset.unit,
                ip: remoteIp,
              });
              res.status(201).json({
                success: true,
                message: "Offer accepted successfully",
              });
            }
          } else {
            res
              .status(401)
              .json({ success: false, message: "Failed to accept the offer" });
          }
        } else {
          res.status(401).json({ success: false, message: "Bid is expired" });
        }
      } else {
        res.status(401).json({ success: false, message: "Action forbidden" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only asset owner can accept an offer",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.rejectOffer = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
    const { assetId } = req.params;
    const { bidId } = req.body;
    const { wallet_address, id } = req.user;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress === wallet_address) {
      if (nftData.state === "lendborrow") {
        let bid = nftData.lendBorrowOffers.filter(
          (item) => item.bidId === bidId
        );
        if (bid[0].status !== "rejected") {
          if (isBefore(new Date(), bid[0].expireOn)) {
            let data = await NftModel.findOneAndUpdate(
              { _id: assetId, "lendBorrowOffers.bidId": bidId },
              {
                $set: {
                  "lendBorrowOffers.$.status": "rejected",
                },
                $push: {
                  history: {
                    action: "Rejected an offer",
                    user: id,
                  },
                },
              }
            );
            if (data) {
              // let activity = await UserActivityModel.create({
              //   userAddress: wallet_address,
              //   user: id,
              //   asset: nftData._id,
              //   assetName: nftData.name,
              //   assetCollection: nftData.nftCollection,
              //   statusText: "Rejected an offer",
              // });
              // let notification = await NotificationModel.create({
              //   nft: nftData._id,
              //   category: "lend-offer-reject",
              //   user: bid[0].bidder,
              //   tokenId: nftData.tokenId,
              //   bidId: bid[0].bidId
              // });
              if (activity) {
                await mixpanel.track("Reject lend offer", {
                  distinct_id: id,
                  asset: assetId,
                  bidId,
                  ip: remoteIp,
                });
                res.status(201).json({
                  success: true,
                  message: "Offer rejected successfully",
                });
              }
            } else {
              res.status(401).json({
                success: false,
                message: "Failed to accept the offer",
              });
            }
          } else {
          }
        } else {
          res
            .status(401)
            .json({ success: false, message: "Offer already rejected" });
        }
      } else {
        res.status(401).json({ success: false, message: "Action forbidden" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only asset owner can reject an offer",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.withdrawOffer = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
    const { assetId } = req.params;
    const { bidId } = req.body;
    const { wallet_address, id } = req.user;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress !== wallet_address) {
      if (nftData.state === "lendborrow" || nftData.state === "none") {
        let bid = nftData.lendBorrowOffers.filter(
          (item) => item.bidId === bidId
        );
        if (
          bid[0].status === "none" ||
          bid[0].status === "rejected" ||
          bid[0].status === "expired"
        ) {
          let data = await NftModel.findOneAndUpdate(
            { _id: assetId, "lendBorrowOffers.bidId": bidId },
            {
              $set: {
                "lendBorrowOffers.$.status": "withdrawn",
              },
            },
            {
              new: true,
            }
          );
          if (data) {
            // let activity = await UserActivityModel.create({
            //   userAddress: wallet_address,
            //   user: id,
            //   asset: nftData._id,
            //   assetName: nftData.name,
            //   assetCollection: nftData.nftCollection,
            //   statusText: "Withdrawn an offer",
            // });
            let notification = await NotificationModel.create({
              nft: nftData._id,
              category: "lend-offer-withdraw",
              user: bid[0].bidder,
            });
            if (notification) {
              await mixpanel.track("Withdrawn lend offer", {
                distinct_id: id,
                asset: assetId,
                bidId,
                bidder: bid[0].bidder,
                lend_amount: bid[0].price,
                asset_type: data.assetType[0],
                asset_token: data.valueOfAsset.unit,
                ip: remoteIp,
              });
              res.status(201).json({
                success: true,
                message: "Offer withdrawn successfully",
              });
            }
          } else {
            res
              .status(401)
              .json({ success: false, message: "Failed to accept the offer" });
          }
        } else {
          res.status(401).json({ success: false, message: "" });
        }
      } else {
        res.status(401).json({ success: false, message: "Action forbidden" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Asset owner can withdraw an offer",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.paybackLoan = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.state === "lendborrow") {
      if (nftData.nftOwnerAddress === wallet_address) {
        let data = await NftModel.findOneAndUpdate(
          { _id: assetId },
          {
            lendBorrowOffers: [],
            state: "none",
            borrowState: "none",
          }
        );
        if (data) {
          // let activity = await UserActivityModel.create({
          //   userAddress: wallet_address,
          //   user: id,
          //   asset: nftData._id,
          //   assetName: nftData.name,
          //   assetCollection: nftData.nftCollection,
          //   statusText: "Loan paid back",
          // });
          let notification = await NotificationModel.create({
            nft: nftData._id,
            category: "lend-borrow-loan-repaid",
            user: nftData.lendBorrowOffer.bidder,
            amount: nftData.lendBorrowOffer.price,
          });
          if (notification) {
            await mixpanel.track("Borrowed loan paid back", {
              distinct_id: id,
              asset: assetId,
              amount: nftData.lendBorrowOffer.price,
              ip: remoteIp,
            });
            res
              .status(201)
              .json({ success: true, message: "Loan paid successfully" });
          }
        } else {
          res
            .status(401)
            .json({ success: false, message: "Failed to payback the loan" });
        }
      } else {
        res.status(401).json({
          success: false,
          message: "Only nft owner can payback the loan",
        });
      }
    } else {
      res.status(401).json({ success: false, message: "Forbidden Action" });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.fetchBorrowNfts = asyncHandler(async (req, res, next) => {
  6;
  try {
    let query;

    const { sortby, search, type, blockchain, validation } = req.query;

    let queryStr = {
      state: "lendborrow",
      borrowState: "none",
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
