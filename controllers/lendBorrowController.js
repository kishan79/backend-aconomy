const asyncHandler = require("../middlewares/async");
const NftModel = require("../models/NFT");
const UserActivityModel = require("../models/UserActivity");
const { addDays, isBefore } = require("date-fns");

exports.proposeOffer = asyncHandler(async (req, res, next) => {
  try {
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
            offer: {
              price,
              apy,
              duration,
              expiration,
              bidid: null,
              nftId,
              nftContractAddress: contractAddress,
            },
          }
        );
        if (data) {
          let activity = await UserActivityModel.create({
            userAddress: wallet_address,
            user: id,
            asset: nftData._id,
            assetName: nftData.name,
            statusText: "Proposed an offer",
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
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress === wallet_address) {
      if (nftData.state === "lendborrow") {
        let data = await NftModel.findOneAndUpdate(
          { _id: assetId },
          {
            state: "none",
            offer: null,
          }
        );
        if (data) {
          let activity = await UserActivityModel.create({
            userAddress: wallet_address,
            user: id,
            asset: nftData._id,
            assetName: nftData.name,
            statusText: "Remove an offer",
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
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    const { price, apy, duration, expiration, bidId } = req.body;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress !== wallet_address) {
      if (nftData.state === "lendborrow") {
        let data = await NftModel.findOneAndUpdate(
          { _id: assetId },
          {
            $push: {
              offers: {
                price,
                apy,
                duration,
                expiration,
                bidId,
                expireOn: addDays(new Date(), expiration),
                bidder: id,
                bidderAddress: wallet_address,
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
            statusText: "Made an offer",
          });
          res
            .status(201)
            .json({ success: true, message: "Offer made successfully" });
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
    const { assetId } = req.params;
    const { bidId } = req.body;
    const { wallet_address, id } = req.user;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress === wallet_address) {
      if (nftData.state === "lendborrow") {
        let bid = nftData.offers.filter((item) => item.bidId === bidId);
        if (isBefore(new Date(), bid[0].expireOn)) {
          let data = await NftModel.findOneAndUpdate(
            { _id: assetId, "offers.bidId": bidId },
            {
              $set: {
                "offers.$.status": "accepted",
                offer: {
                  price: bid[0].price,
                  apy: bid[0].apy,
                  duration: bid[0].duration,
                  expiration: bid[0].expiration,
                  bidId: bid[0].bidId,
                  bidderAddress: bid[0].bidderAddress,
                  bidder: bid[0].bidder,
                },
                borrowState: "active",
              },
            }
          );
          if (data) {
            let activity = await UserActivityModel.create({
              userAddress: wallet_address,
              user: id,
              asset: nftData._id,
              assetName: nftData.name,
              statusText: "Accepted an offer",
            });
            res
              .status(201)
              .json({ success: true, message: "Offer accepted successfully" });
          } else {
            res
              .status(401)
              .json({ success: false, message: "Failed to accept the offer" });
          }
        } else {
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
    const { assetId } = req.params;
    const { bidId } = req.body;
    const { wallet_address, id } = req.user;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.nftOwnerAddress === wallet_address) {
      if (nftData.state === "lendborrow") {
        let bid = nftData.offers.filter((item) => item.bidId === bidId);
        if (bid[0].status !== "rejected") {
          if (isBefore(new Date(), bid[0].expireOn)) {
            let data = await NftModel.findOneAndUpdate(
              { _id: assetId, "offers.bidId": bidId },
              {
                $set: {
                  "offers.$.status": "rejected",
                },
              }
            );
            if (data) {
              let activity = await UserActivityModel.create({
                userAddress: wallet_address,
                user: id,
                asset: nftData._id,
                assetName: nftData.name,
                statusText: "Rejected an offer",
              });
              res.status(201).json({
                success: true,
                message: "Offer rejected successfully",
              });
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

exports.paybackLoan = asyncHandler(async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { wallet_address, id } = req.user;
    let nftData = await NftModel.findOne({ _id: assetId });
    if (nftData.state === "lendborrow") {
      if (nftData.offer.bidderAddress === wallet_address) {
        let data = await NftModel.findOneAndUpdate(
          { _id: assetId },
          {
            offers: null,
            state: "none",
            borrowState: "none",
          }
        );
        if (data) {
          let activity = await UserActivityModel.create({
            userAddress: wallet_address,
            user: id,
            asset: nftData._id,
            assetName: nftData.name,
            statusText: "Loan paid back",
          });
          res
            .status(201)
            .json({ success: true, message: "Loan paid successfully" });
        } else {
          res
            .status(401)
            .json({ success: false, message: "Failed to payback the loan" });
        }
      } else {
        res.status(401).json({
          success: false,
          message: "Only accepted bidder can payback the loan",
        });
      }
    } else {
      res.status(401).json({ success: false, message: "Forbidden Action" });
    }
  } catch (err) {
    res.status(401).json({ success: false });
  }
});
