const asyncHandler = require("../middlewares/async");
const crypto = require("crypto");
const UserModel = require("../models/User");
const ValidatorModel = require("../models/Validator");
const mixpanel = require("../services/mixpanel");
const { getRemoteIp } = require("../utils/utils");

const saveDataToDb = async (payload, req) => {
  const remoteIp = getRemoteIp(req);
  let applicantUser = await UserModel.find({ _id: payload.externalUserId });
  if (applicantUser.length) {
    let data = await UserModel.findOneAndUpdate(
      { _id: payload.externalUserId },
      {
        applicantType: payload.applicantType,
        reviewResult: !!payload.reviewResult ? payload.reviewResult : {},
        levelName: payload.levelName,
        sandboxMode: payload.sandboxMode,
        kycEventType: payload.type,
        reviewStatus: payload.reviewStatus,
      }
    );
    if (
      data &&
      payload.reviewStatus === "completed" &&
      payload.reviewResult.reviewAnswer === "GREEN"
    ) {
      await mixpanel.track("KYC verification approved", {
        distinct_id: payload.externalUserId,
        name: data.name,
        user_name: data.username,
        wallet_address: data.wallet_address,
        profile_type: data.role,
        email: !!data.email ? data.email : "",
        user_id: payload.externalUserId,
        ip: remoteIp,
      });
    }
  } else {
    let data = await ValidatorModel.findOneAndUpdate(
      { _id: payload.externalUserId },
      {
        applicantType: payload.applicantType,
        reviewResult: !!payload.reviewResult ? payload.reviewResult : {},
        levelName: payload.levelName,
        sandboxMode: payload.sandboxMode,
        kycEventType: payload.type,
        reviewStatus: payload.reviewStatus,
      }
    );
    if (
      data &&
      payload.reviewStatus === "completed" &&
      payload.reviewResult.reviewAnswer === "GREEN"
    ) {
      await mixpanel.track("KYC verification approved", {
        distinct_id: payload.externalUserId,
        name: data.name,
        user_name: data.username,
        wallet_address: data.wallet_address,
        profile_type: data.role,
        email: !!data.email ? data.email : "",
        user_id: payload.externalUserId,
        ip: remoteIp,
      });
    }
  }
};

exports.kycWebhook = asyncHandler(async (req, res, next) => {
  try {
    const signature = req.get("x-payload-digest");

    let payload = req.body;

    const hmac = crypto
      .createHmac("sha1", process.env.SUMSUB_WEBHOOK_SECRET_KEY)
      .update(payload)
      .digest("hex");

    payload = JSON.parse(payload.toString());
    console.log(payload);
    if (signature === hmac) {
      //   switch (payload.type) {
      //     case "applicantCreated":
      //       await saveDataToDb(payload);
      //       console.log(`Identity has been verified for ${payload.applicantId}`);
      //       break;
      //     case "applicantReviewed":
      //       await saveDataToDb(payload);
      //       console.log(
      //         `New document has been uploaded by ${payload.applicantId}`
      //       );
      //       break;
      //   }
      await saveDataToDb(payload, req);
      res.sendStatus(200);
    } else {
      console.log("Invalid signature");
      res.sendStatus(400);
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(400);
  }
});
