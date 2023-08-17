const axios = require("axios");
const crypto = require("crypto");
const asyncHandler = require("../middlewares/async");
const ValidatorModel = require("../models/Validator");

exports.initiateKYB = asyncHandler(async (req, res, next) => {
  try {
    const { id, name } = req.user;
    let payload = {
      reference: `SP_REQUEST_${Math.random()}`,
      // callback_url      : "https://yourdomain.com/profile/sp-notify-callback"
    };
    payload["kyb"] = {
      company_name: name,
    };

    const auth = `${process.env.SHUFTI_PRO_CLIENTID}:${process.env.SHUFTI_PRO_SECRET_KEY}`;
    const b64Val = Buffer.from(auth).toString("base64");

    axios
      .post(process.env.SHUFTI_PRO_URL, payload, {
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${b64Val}`,
          "Content-Type": "application/json",
        },
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
          let validator = await ValidatorModel.findOneAndUpdate(
            { _id: id },
            {
              verification_url: data.verification_url,
              kycEventType: data.event,
            }
          );
          if (validator) {
            res.status(200).json({
              success: true,
              data: {
                verification_url: data.verification_url,
                event: data.event,
              },
            });
          }
        } else {
          console.log(`Invalid signature: ${response.data}`);
          res.status(400).json({ success: false });
        }
      })
      .catch(async (error) => {
        let validator = await ValidatorModel.findOne({ _id: id });
        if (validator) {
          res.status(200).json({
            success: true,
            data: {
              verification_url: validator.verification_url,
              event: validator.kycEventType,
            },
          });
        }
      });
  } catch (err) {
    res.status(400).json({ success: false });
  }
});
