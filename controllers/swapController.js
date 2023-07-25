const asyncHandler = require("../middlewares/async");
const NftModel = require("../models/NFT");
const SwapModel = require("../models/Swap");
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

exports.listForSwap = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress === wallet_address) {
      if (nftData.state === "none") {
        let swapData = await SwapModel.create({
          swapOwner: id,
          swapOwnerAddress: wallet_address,
          asset: assetId,
        });
        if (swapData) {
          let data = await NftModel.findOneAndUpdate(
            { _id: assetId },
            {
              state: "swap",
            }
          );
          if (data) {
            res.status(201).json({ success: true, message: "Listed for swap" });
          } else {
            res.status(401).json({
              success: false,
              message: "Failed to list asset for swap",
            });
          }
        } else {
          res
            .status(401)
            .json({ success: false, message: "Failed to list asset for swap" });
        }
      } else if (nftData.state === "swap") {
        let swapData = await SwapModel.findOneAndDelete({
          asset: assetId,
          status: "active",
        });
        if (swapData) {
          let data = await NftModel.findOneAndUpdate(
            { _id: assetId },
            {
              state: "none",
            }
          );
          if (data) {
            res
              .status(201)
              .json({ success: true, message: "Unlisted for swap" });
          } else {
            res.status(401).json({
              success: false,
              message: "Failed to unlist asset for swap",
            });
          }
        } else {
          res.status(401).json({
            success: false,
            message: "Failed to unlist asset for swap",
          });
        }
      } else {
        res.status(401).json({ success: false, message: "Forbidden action" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only asset owner can list/unlist asset for swap",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.requestForSwap = asyncHandler(async (req, res, next) => {
  const { assetId } = req.params;
  const {
    swapAsset,
    nftContractAddress,
    nftContractAddress2,
    tokenId,
    tokenId2,
    swapId,
  } = req.body;
  const { wallet_address, id } = req.user;
  let nftData = await NftModel.findOne({ _id: assetId });
  if (nftData.nftOwnerAddress !== wallet_address) {
    if (nftData.state === "swap") {
      let swapNftData = await NftModel.findOneAndUpdate(
        { _id: swapAsset },
        { swapState: "requested" }
      );
      if (swapNftData && swapNftData.nftOwnerAddress === wallet_address) {
        let swapData = await SwapModel.findOneAndUpdate(
          {
            asset: assetId,
            status: "active",
          },
          {
            $push: {
              offers: {
                asset: swapNftData._id,
                assetOwner: swapNftData.nftOwner,
                assetOwnerAddress: swapNftData.nftOwnerAddress,
                nftContractAddress,
                nftContractAddress2,
                tokenId,
                tokenId2,
                swapId,
              },
            },
          }
        );
        if (swapData) {
          let notification = await NotificationModel.create({
            nft: assetId,
            category: "swap-request",
            user: nftData.nftOwner,
          });
          if (notification) {
            res.status(201).json({
              success: true,
              message: "Swap request sent successfully",
            });
          }
        } else {
          res
            .status(401)
            .json({ success: false, message: "Failed to sent request" });
        }
      } else {
        res
          .status(401)
          .json({ success: false, message: "Not a valid swap asset owner" });
      }
    } else {
      res
        .status(401)
        .json({ success: false, message: "Asset not listed for swap" });
    }
  } else {
    res
      .status(401)
      .json({ success: false, message: "Asset owner cannot request for swap" });
  }
});

exports.acceptSwapRequest = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { swapId } = req.body;
    const { wallet_address, id } = req.user;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress === wallet_address) {
      if (nftData.state === "swap") {
        let swapData = await SwapModel.findOne({
          asset: assetId,
          status: "active",
        });
        if (swapData) {
          let request = swapData.offers.filter(
            (item) => item.swapId === swapId
          );
          if (request[0].status === "none") {
            let swapNftData = await NftModel.findOne({
              _id: request[0].asset,
            });
            if (swapNftData.state === "none" || swapNftData.state === "swap") {
              let data = await NftModel.findOneAndUpdate(
                { _id: assetId },
                {
                  state: "none",
                  nftOwner: request[0].assetOwner,
                  nftOwnerAddress: request[0].assetOwnerAddress,
                  $push: {
                    history: {
                      action: "Swapped",
                      user: id,
                    },
                  },
                }
              );
              if (data) {
                let data2 = await NftModel.findOneAndUpdate(
                  { _id: request[0].asset },
                  {
                    state: "none",
                    nftOwner: nftData.nftOwner,
                    nftOwnerAddress: nftData.nftOwnerAddress,
                    swapState: "none",
                    $push: {
                      history: {
                        action: "Swapped",
                        user: request[0].assetOwner,
                      },
                    },
                  }
                );
                if (data2) {
                  let swapNft = await SwapModel.findOneAndUpdate(
                    {
                      asset: assetId,
                      status: "active",
                      "offers.swapId": swapId,
                    },
                    {
                      $set: {
                        "offers.$.status": "accepted",
                        status: "inactive",
                      },
                    },
                    {
                      new: true,
                    }
                  );
                  if (swapNft) {
                    let notification = await NotificationModel.create({
                      nft: assetId,
                      swapnft: request[0].asset,
                      category: "swap-request-accept",
                      user: request[0].assetOwner,
                    });
                    if (notification) {
                      for (let i = 0; i < swapNft.offers.length; i++) {
                        if (swapNft.offers[i].status === "none") {
                          let reverseSwapState =
                            await NftModel.findOneAndUpdate(
                              { _id: swapNft.offers[i].asset },
                              { swapState: "none" }
                            );
                          let notification2 = await NotificationModel.create({
                            nft: swapNft.offers[i].asset,
                            swapnft: swapNft.asset,
                            category: "swap-request-reject",
                            user: swapNft.offers[i].assetOwner,
                            swapId: swapNft.offers[i].swapId,
                            swapRequestId: swapNft._id,
                          });
                        }
                      }
                      res.status(201).json({
                        success: true,
                        message: "Request accepted successfully",
                      });
                    }
                  } else {
                    res.status(401).json({
                      success: false,
                      message: "Failed to accept the request",
                    });
                  }
                } else {
                  res.status(401).json({
                    success: false,
                    message: "Failed to accept the request",
                  });
                }
              } else {
                res.status(401).json({
                  success: false,
                  message: "Failed to accept the request",
                });
              }
            } else {
              res.status(401).json({
                success: false,
                message:
                  "The asset with which the current asset is to be swapped is occupied in other actions",
              });
            }
          } else {
            res
              .status(401)
              .json({ success: false, message: "Forbidden action" });
          }
        } else {
          res
            .status(401)
            .json({ success: false, message: "Failed to fetch swap request" });
        }
      } else {
        res
          .status(401)
          .json({ success: false, message: "Asset not listed for swap" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Only asset owner can accept the swap request",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.rejectSwapRequest = asyncHandler(async (req, res, next) => {
  const { assetId } = req.params;
  const { swapId } = req.body;
  const { wallet_address, id } = req.user;
  let nftData = await NftModel.findOne({ _id: assetId });
  if (nftData.nftOwnerAddress === wallet_address) {
    let data = await SwapModel.findOneAndUpdate(
      {
        asset: assetId,
        status: "active",
        "offers.swapId": swapId,
      },
      {
        $set: {
          "offers.$.status": "rejected",
        },
      }
    );
    if (data) {
      let offer = data.offers.filter((obj) => obj.swapId === swapId);
      // let swapNft = await NftModel.findByIdAndUpdate(
      //   { _id: offer[0].asset },
      //   { swapState: "none" }
      // );
      let notification = await NotificationModel.create({
        nft: offer[0].asset,
        swapnft: assetId,
        category: "swap-request-reject",
        user: offer[0].assetOwner,
        swapId: offer[0].swapId,
        swapRequestId: data._id,
      });
      if (notification) {
        res.status(201).json({
          success: true,
          message: "Request rejected successfully",
        });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Failed to reject the request",
      });
    }
  } else {
    res.status(401).json({
      success: false,
      message: "Only asset owner can cancel a request",
    });
  }
});

exports.cancelSwapRequest = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { swapId, swapRequestId } = req.body;
    const { wallet_address, id } = req.user;
    let swapData = await SwapModel.findOne({
      _id: swapRequestId,
    });
    if (swapData) {
      if (swapData.swapOwnerAddress !== wallet_address) {
        let request = swapData.offers.filter((item) => item.swapId === swapId);
        if (request[0].status === "none" || request[0].status === "rejected") {
          //   let data = await NftModel.findOneAndUpdate(
          //     { _id: assetId },
          //     { $pull: { swapOffers: { swapId } } }
          //   );
          let data = await SwapModel.findOneAndUpdate(
            {
              _id: swapData._id,
              "offers.swapId": swapId,
            },
            {
              $set: {
                "offers.$.status": "cancelled",
              },
            }
          );
          if (data) {
            let swapNft = await NftModel.findByIdAndUpdate(
              { _id: request[0].asset },
              { swapState: "none" }
            );
            if (swapNft) {
              res.status(201).json({
                success: true,
                message: "Request cancelled successfully",
              });
            }
          } else {
            res.status(401).json({
              success: false,
              message: "Failed to cancel the request",
            });
          }
        } else {
          res.status(401).json({
            success: false,
            message: "Forbidden action",
          });
        }
      } else {
        res.status(401).json({
          success: false,
          message: "Swap owner can't cancel the user swap request",
        });
      }
    } else {
      res.status(401).json({ success: false, message: "Request not found" });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});

exports.fetchSwapRequest = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    let data = await SwapModel.findOne({
      asset: assetId,
      status: "active",
    }).populate([
      {
        path: "offers.assetOwner",
        select: userSelectQuery,
      },
      {
        path: "swapOwner",
        select: userSelectQuery,
      },
      {
        path: "asset",
        select: "name mediaLinks assetType _id",
      },
      {
        path: "offers.asset",
        select: "name mediaLinks assetType _id",
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

exports.fetchSwapNfts = asyncHandler(async (req, res, next) => {
  try {
    let query;

    const { sortby, search, type, blockchain, validation } = req.query;

    let queryStr = {
      state: "swap",
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

exports.fetchSwapStatus = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { wallet_address } = req.user;
    let swapData = await SwapModel.findOne({
      asset: assetId,
      status: "active",
    });
    let data =
      swapData &&
      swapData.offers.filter(
        (item) => item.assetOwnerAddress === wallet_address
      );
    if (swapData && swapData.swapOwnerAddress === wallet_address) {
      res
        .status(200)
        .json({ success: true, status: "You made a swap request" });
    } else if (data.length) {
      res.status(200).json({ success: true, status: "NFT sent for swap" });
    } else {
      res.status(400).json({ success: false, status: "" });
    }
  } catch (err) {
    res.status(400).json({
      success: false,
    });
  }
});
