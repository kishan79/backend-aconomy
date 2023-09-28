const axios = require("axios");
const crypto = require("crypto");
const asyncHandler = require("../middlewares/async");
const ValidatorModel = require("../models/Validator");

exports.initiateKYB = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.user;
    const { company_name, company_registration_number } = req.body;
    let payload = {
      reference: `SP_REQUEST_${Math.random()}`,
      callback_url: `${process.env.SERVER_URL}/webhook/kyb`,
      allow_retry: "1",
    };
    if (company_name) {
      payload["kyb"] = {
        company_name,
      };
    }
    if (company_registration_number) {
      payload["kyb"] = {
        company_registration_number,
      };
    }

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
          res.status(200).json({
            success: true,
            data: {
              event: data.event,
            },
          });
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
              event: validator.kycEventType,
            },
          });
        }
      });
  } catch (err) {
    res.status(400).json({ success: false });
  }
});
