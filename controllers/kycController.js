const axios = require("axios");
const crypto = require("crypto");
const asyncHandler = require("../middlewares/async");
const UserModel = require("../models/User");

exports.initiateKYC = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.user;
    let payload = {
      reference: id,
      callback_url: `${process.env.SERVER_URL}/webhook/kyc`,
      language: "EN",
      redirect_url: `${process.env.ACONOMY_URL}/user/${id}`,
      verification_mode: "any",
      allow_offline: "1",
      allow_online: "1",
      allow_retry: "1",
      show_privacy_policy: "1",
      show_results: "1",
      show_consent: "1",
      show_feedback_form: "0",
    };
    // payload["face"] = "";
    payload["document"] = {};
    // payload["document_two"] = {};
    payload["address"] = {};
    // payload["consent"] = {
    //   proof: "",
    //   supported_types: ["handwritten", "printed"],
    //   text: "this is a customised text",
    // };
    // payload["phone"] = {};
    // payload["background_checks"] = {};

    const auth = `${process.env.SHUFTI_PRO_CLIENTID}:${process.env.SHUFTI_PRO_SECRET_KEY}`;
    const b64Val = Buffer.from(auth).toString("base64");

    axios
      .post(process.env.SHUFTI_PRO_URL, payload, {
        headers: {
          Authorization: `Basic ${b64Val}`,
          "Content-Type": "application/json",
        },
        responseType: "text",
      })
      .then(async (response) => {
        const sp_signature = response.headers.signature;

        const hashed_secret_key = crypto
          .createHash("sha256")
          .update(process.env.SHUFTI_PRO_SECRET_KEY)
          .digest("hex");

        const calculated_signature = crypto
          .createHash("sha256")
          .update(response.data + hashed_secret_key)
          .digest("hex");
        if (sp_signature === calculated_signature) {
          let data = JSON.parse(response.data);
          // let user = await UserModel.findOneAndUpdate(
          //   { _id: id },
          //   {
          //     verification_url: data.verification_url,
          //     kycEventType: data.event,
          //   }
          // );
          // if (user) {
          res.status(200).json({
            success: true,
            data: {
              verification_url: data.verification_url,
              event: data.event,
            },
          });
          // }
        } else {
          console.log(`Invalid signature: ${response.data}`);
          res.status(400).json({ success: false });
        }
      })
      .catch(async (error) => {
        let user = await UserModel.findOne({ _id: id });
        if (user) {
          res.status(200).json({
            success: true,
            data: {
              verification_url: user.verification_url,
              event: user.kycEventType,
            },
          });
        }
      });
  } catch (err) {
    res.status(400).json({ success: false });
  }
});
