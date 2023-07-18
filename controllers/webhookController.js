const asyncHandler = require("../middlewares/async");
const crypto = require("crypto");
const UserModel = require("../models/User");

const saveDataToDb = async (payload) => {
  let data = await UserModel.findOneAndUpdate(
    { _id: payload.externalUserId },
    {
      applicantType: payload.applicantType,
      reviewResult: Object.keys(payload.reviewResult).length
        ? payload.reviewResult
        : {},
      levelName: payload.levelName,
      sandboxMode: payload.sandboxMode,
      kycEventType: payload.type,
      reviewStatus: payload.reviewStatus,
    }
  );
};

exports.kycWebhook = asyncHandler(async (req, res, next) => {
  try {
    const signature = req.get("X-Signature");
    const payload = req.body;

    const hmac = crypto
      .createHmac("sha256", process.env.SUMSUB_WEBHOOK_SECRET_KEY)
      .update(JSON.stringify(payload))
      .digest("hex");

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
      await saveDataToDb(payload);

      res.status(200);
    } else {
      console.log("Invalid signature");
      res.status(400);
    }
  } catch (err) {
    res.status(400);
  }
});
