const asyncHandler = require("../middlewares/async");
const NftModel = require("../models/NFT");
const SwapModel = require("../models/Swap");
const UserActivityModel = require("../models/UserActivity");
const { addDays, isBefore } = require("date-fns");

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
            res
              .status(401)
              .json({ success: false, message: "Listed for swap" });
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
          _id: assetId,
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
              .status(401)
              .json({ success: false, message: "Unlisted for swap" });
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
      let swapNftData = await NftModel.findOne({ _id: swapAsset });
      if (swapNftData) {
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
          res
            .status(201)
            .json({ success: true, message: "Swap request sent successfully" });
        } else {
          res
            .status(401)
            .json({ success: false, message: "Failed to sent request" });
        }
      } else {
        res
          .status(401)
          .json({ success: false, message: "Not a valid swap asset" });
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
          if (request.status === "none") {
            let swapNftData = await NftModel.findOne({
              _id: request.asset,
            });
            if (swapNftData.state === "none" || swapNftData.state === "swap") {
              let data = await NftModel.findOneAndUpdate(
                { _id: assetId },
                {
                  state: "none",
                  nftOwner: request.assetOwner,
                  nftOwnerAddress: request.nftContractAddress2,
                }
              );
              if (data) {
                let data2 = await NftModel.findOneAndUpdate(
                  { _id: request.asset },
                  {
                    state: "none",
                    nftOwner: nftData.nftOwner,
                    nftOwnerAddress: nftData.nftOwnerAddress,
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
                    }
                  );
                  if (swapNft) {
                    res.status(201).json({
                      success: true,
                      message: "Request accepted successfully",
                    });
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
      res.status(201).json({
        success: true,
        message: "Request rejected successfully",
      });
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
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress !== wallet_address) {
      let swapData = await SwapModel.findOne({
        _id: swapRequestId,
      });
      if (swapData) {
        let request = swapData.offers.filter((item) => item.swapId === swapId);
        if (request.status === "none") {
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
            res.status(201).json({
              success: true,
              message: "Request cancelled successfully",
            });
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
        res.status(401).json({ success: false, message: "Request not found" });
      }
    } else {
      res.status(401).json({
        success: false,
        message: "Asset owner can't cancel the user swap request",
      });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});
