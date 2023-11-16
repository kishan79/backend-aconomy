const asyncHandler = require("../middlewares/async");
const NftModel = require("../models/NFT");
const LendBorrowModel = require("../models/LendBorrow");
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
    let data = await NftModel.findOne({ _id: assetId });
    if (data.nftOwnerAddress === wallet_address) {
      if (data.state === "none") {
        LendBorrowModel.create(
          {
            asset: assetId,
            nftId,
            nftContractAddress: contractAddress,
            price,
            apy,
            duration,
            expiration,
            borrower: id,
            borrowerAddress: wallet_address,
          },
          async (err, doc) => {
            if (err) {
              res.status(401).json({ success: false });
            } else {
              if (!!doc) {
                let nftData = await NftModel.findOneAndUpdate(
                  {
                    _id: assetId,
                  },
                  {
                    state: "lendborrow",
                    lendBorrowOffer: {
                      nftId,
                      nftContractAddress: contractAddress,
                      price,
                      apy,
                      duration,
                      expiration,
                    },
                  }
                );
                if (nftData) {
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
                  res.status(201).json({
                    success: true,
                    message: "Offer proposed successfully",
                  });
                } else {
                  res.status(401).json({
                    success: false,
                    message: "Failed to propose an offer",
                  });
                }
              }
            }
          }
        );
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
    let lendborrowData = await LendBorrowModel.findOne({
      asset: assetId,
      cancelled: false,
    });
    if (lendborrowData) {
      let data = await NftModel.findOne({ _id: assetId });
      if (data.nftOwnerAddress === wallet_address) {
        if (data.state === "lendborrow") {
          LendBorrowModel.findOneAndUpdate(
            {
              _id: lendborrowData._id,
            },
            { cancelled: true, status: "inactive" },
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
                    }
                  );
                  if (nftData) {
                    for (let i = 0; i < lendborrowData.offers.length; i++) {
                      if (lendborrowData.offers[i].status === "none") {
                        let notification2 = await NotificationModel.create({
                          nft: nftData._id,
                          category: "lend-offer-reject",
                          user: lendborrowData.offers[i].lender,
                          tokenId: nftData.tokenId,
                          bidId: lendborrowData.offers[i].bidId,
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
                      borrow_price: lendborrowData.price,
                      asset_type: nftData.assetType[0],
                      asset_token: nftData.valueOfAsset.unit,
                      ip: remoteIp,
                    });
                    res.status(201).json({
                      success: true,
                      message: "Offer removed from borrow successfully",
                    });
                  } else {
                    res.status(401).json({
                      success: false,
                      message: "Failed to remove from borrow",
                    });
                  }
                }
              }
            }
          );
        } else {
          res.status(401).json({ success: false, message: "Action forbidden" });
        }
      } else {
        res.status(401).json({
          success: false,
          message: "Only asset owner can remove from borrow",
        });
      }
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
    let data = await NftModel.findOne({ _id: assetId });
    if (data.nftOwnerAddress !== wallet_address) {
      if (data.state === "lendborrow") {
        LendBorrowModel.findOneAndUpdate(
          {
            asset: assetId,
            cancelled: false,
          },
          {
            $push: {
              offers: {
                price,
                apy,
                duration,
                expiration,
                bidId,
                expireOn: addDays(new Date(), expiration),
                lender: id,
                lenderAddress: wallet_address,
                erc20Address,
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
                  statusText: "Made an offer",
                });
                let notification = await NotificationModel.create({
                  nft: data._id,
                  category: "lend-make-offer",
                  user: data.nftOwner,
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
                  res.status(201).json({
                    success: true,
                    message: "Offer made successfully",
                  });
                }
              } else {
                res
                  .status(401)
                  .json({ success: false, message: "Failed to make an offer" });
              }
            }
          }
        );
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
    let lendborrowData = await LendBorrowModel.findOne({
      asset: assetId,
      cancelled: false,
    });
    let nftData = await NftModel.findOne({ _id: assetId });
    if (lendborrowData.borrowerAddress === wallet_address) {
      let offer = lendborrowData.offers.filter((item) => item.bidId === bidId);
      if (
        isBefore(new Date(), offer[0].expireOn) &&
        offer[0].status === "none"
      ) {
        let data = await LendBorrowModel.findOneAndUpdate(
          {
            _id: lendborrowData._id,
            "offers.bidId": bidId,
          },
          {
            $set: {
              "offers.$.status": "accepted",
              // status: "inactive",
            },
            // cancelled: true,
          },
          { new: true }
        );
        if (data) {
          let nftData2 = await NftModel.findByIdAndUpdate(
            {
              _id: assetId,
            },
            {
              borrowState: "active",
              $set: {
                "lendBorrowOffer.accepted": {
                  lender: offer[0].lender,
                  lenderAddress: offer[0].lenderAddress,
                  price: offer[0].price,
                  apy: offer[0].apy,
                  duration: offer[0].duration,
                  bidId: offer[0].bidId,
                  expireOn: offer[0].expireOn,
                  status: "accepted",
                },
              },
            }
          );
          if (nftData2) {
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
              user: offer[0].lender,
            });
            if (notification) {
              for (let i = 0; i < data.offers.length; i++) {
                if (data.offers[i].status === "none") {
                  let notification2 = await NotificationModel.create({
                    nft: nftData._id,
                    category: "lend-offer-declined",
                    user: data.offers[i].lender,
                    tokenId: nftData.tokenId,
                    bidId: data.offers[i].bidId,
                    lendborrowId: data._id,
                    lendborrowNftId: data.nftId,
                  });
                }
              }
              await mixpanel.track("Accept lend offer", {
                distinct_id: id,
                asset: assetId,
                bidId,
                bidder: offer[0].lender,
                lend_amount: offer[0].price,
                asset_type: nftData.assetType[0],
                asset_token: nftData.valueOfAsset.unit,
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
          res
            .status(401)
            .json({ success: false, message: "Failed to accept the offer" });
        }
      } else {
        res.status(401).json({ success: false, message: "Offer is expired" });
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
    let lendborrowData = await LendBorrowModel.findOne({
      asset: assetId,
      status: "active",
    });
    if (lendborrowData.status === "active") {
      if (lendborrowData.borrowerAddress === wallet_address) {
        let offer = lendborrowData.offers.filter(
          (item) => item.bidId === bidId
        );
        let data = await LendBorrowModel.findOneAndUpdate(
          // { "bids.bidId": bidId },
          { _id: lendborrowData._id, "offers.bidId": bidId },
          {
            $set: {
              "offers.$.status": "rejected",
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
          //   statusText: "Rejected an offer",
          // });
          let notification = await NotificationModel.create({
            nft: nftData._id,
            category: "lend-offer-reject",
            user: offer[0].lender,
            tokenId: nftData.tokenId,
            bidId: offer[0].bidId,
            lendborrowId: lendborrowData._id,
          });
          // if (activity) {
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
          // }
        } else {
          res.status(401).json({
            success: false,
            message: "Failed to reject the offer",
          });
        }
      } else {
        res.status(401).json({
          success: false,
          message: "Only asset owner can reject an offer",
        });
      }
    } else {
      res
        .status(401)
        .json({ success: false, message: "Lend & Borrow is closed" });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.withdrawOffer = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
    const { assetId } = req.params;
    const { lendborrowId, bidId } = req.body;
    const { wallet_address, id } = req.user;
    // let nftData = await NftModel.findOne({ _id: assetId });
    let lendborrowData = await LendBorrowModel.findOne({
      _id: lendborrowId,
    });
    let offer = lendborrowData.offers.filter((item) => item.bidId === bidId);
    if (lendborrowData.borrowerAddress !== wallet_address) {
      if (
        offer[0].lenderAddress === wallet_address &&
        offer[0].status !== "accepted"
      ) {
        if (offer[0].status !== "accepted" && offer[0].status !== "withdrawn") {
          let data = await LendBorrowModel.findOneAndUpdate(
            {
              _id: lendborrowId,
              "offers.bidId": bidId,
            },
            {
              $set: {
                "offers.$.status": "withdrawn",
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
              .json({ success: true, message: "Offer successfully withdrawn" });
          } else {
            res
              .status(401)
              .json({ success: false, message: "Offer failed to withdraw" });
          }
        } else {
          res.status(401).json({
            success: false,
            message: "Offer already accepted or withdrawn",
          });
        }
      } else {
        res.status(401).json({
          success: false,
          message: "Lender can't withdrawn the accepted bid",
        });
      }
    } else {
      res
        .status(401)
        .json({ success: false, message: "Borrower can't withdraw bid" });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.paybackLoan = asyncHandler(async (req, res, next) => {
  try {
    const remoteIp = getRemoteIp(req);
    const { assetId } = req.params;
    const { bidId } = req.body;
    const { wallet_address, id } = req.user;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.state === "lendborrow") {
      if (nftData.nftOwnerAddress === wallet_address) {
        LendBorrowModel.findOneAndUpdate(
          {
            asset: assetId,
            cancelled: false,
            "offers.bidId": bidId,
          },
          {
            $set: {
              "offers.$.status": "repaid",
            },
            status: "inactive",
            cancelled: true,
          },
          null,
          async (err, doc) => {
            if (err) {
              res.status(401).json({ success: false });
            } else {
              let offer = doc.offers.filter((item) => item.bidId === bidId);
              if (!!doc) {
                let data = await NftModel.findByIdAndUpdate(
                  {
                    _id: assetId,
                  },
                  { state: "none", borrowState: "none", lendBorrowOffer: null }
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
                    user: offer.lender,
                    amount: offer.price,
                  });
                  if (notification) {
                    await mixpanel.track("Borrowed loan paid back", {
                      distinct_id: id,
                      asset: assetId,
                      amount: offer.price,
                      ip: remoteIp,
                    });
                    res.status(201).json({
                      success: true,
                      message: "Loan paid successfully",
                    });
                  }
                } else {
                  res.status(401).json({
                    success: false,
                    message: "Failed to payback the loan",
                  });
                }
              }
            }
          }
        );
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
  try {
    let query;

    const { sortby, search, type, blockchain, validation } = req.query;

    let queryStr = {
      state: "lendborrow",
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
        {
          path: "validator",
          select: "_id name profileImage kybEventType whitelisted",
        },
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
        "_id name validationState nftOwner nftOwnerType validator mediaLinks state lendBorrowOffer"
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

exports.fetchLastestlendborrowByAsset = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    let data = await LendBorrowModel.findOne({
      asset: assetId,
      // status: "active",
      cancelled: false,
    }).populate([
      // {
      //   path: "auctionOwner",
      //   select: userSelectQuery,
      // },
      {
        path: "offers.lender",
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
