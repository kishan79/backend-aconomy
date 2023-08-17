const asyncHandler = require("../middlewares/async");
const crypto = require("crypto");
const UserModel = require("../models/User");
const ValidatorModel = require("../models/Validator");
const mixpanel = require("../services/mixpanel");
const { getRemoteIp } = require("../utils/utils");

const saveDataToDb = async (payload, req) => {
  const remoteIp = getRemoteIp(req);
  if (payload.event === "verification.accepted") {
    let data = await UserModel.findOneAndUpdate(
      { _id: payload.reference },
      {
        kycEventType: payload.event,
      }
    );
    if (data) {
      await mixpanel.track("KYC verification approved", {
        distinct_id: payload.reference,
        name: data.name,
        user_name: data.username,
        wallet_address: data.wallet_address,
        profile_type: data.role,
        email: !!data.email ? data.email : "",
        user_id: payload.reference,
        ip: remoteIp,
      });
    }
  } else {
    let data = await UserModel.findOneAndUpdate(
      { _id: payload.reference },
      {
        verification_url: payload.verification_url,
        kycEventType: payload.event,
      }
    );
    if (data) {
      await mixpanel.track("KYC initiated", {
        distinct_id: payload.reference,
        name: data.name,
        user_name: data.username,
        wallet_address: data.wallet_address,
        profile_type: data.role,
        email: !!data.email ? data.email : "",
        user_id: payload.reference,
        ip: remoteIp,
      });
    }
  }
};

exports.kycWebhook = asyncHandler(async (req, res, next) => {
  try {
    let payload = req.body;
    const signature = req.get("signature");

    const hashed_secret_key = crypto
      .createHash("sha256")
      .update(process.env.SHUFTI_PRO_SECRET_KEY)
      .digest("hex");

    const calculated_signature = crypto
      .createHash("sha256")
      .update(payload + hashed_secret_key)
      .digest("hex");

    if (signature === calculated_signature) {
      let data = JSON.parse(payload);
      if (
        data.event === "verification.accepted" ||
        data.event === "request.pending"
      ) {
        await saveDataToDb(data, req);
        res.sendStatus(200);
      } else {
        res.sendStatus(400);
      }
    } else {
      res.sendStatus(400);
    }
  } catch (err) {
    console.log(err);
    res.sendstatus(400);
  }
});
