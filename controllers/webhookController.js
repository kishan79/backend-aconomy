const asyncHandler = require("../middlewares/async");
const crypto = require("crypto");
const UserModel = require("../models/User");

const saveDataToDb = async (payload) => {
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
};

exports.kycWebhook = asyncHandler(async (req, res, next) => {
  try {
    const signature = req.get("x-payload-digest");

    let payload = req.body;

    const hmac = crypto
      .createHmac("sha1", process.env.SUMSUB_WEBHOOK_SECRET_KEY)
      .update(payload)
      .digest("hex");
    
    console.log(JSON.parse(payload.toString()));
    payload = JSON.parse(payload.toString());
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