const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const FormData = require("form-data");
const asyncHandler = require("../middlewares/async");
const UserModel = require("../models/User");
const ValidatorModel = require("../models/Validator");

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN; // Example: sbx:uY0CgwELmgUAEyl4hNWxLngb.0WSeQeiYny4WEqmAALEAiK2qTC96fBad - Please don't forget to change when switching to production
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY; // Example: Hej2ch71kG2kTd1iIUDZFNsO5C1lh5Gq - Please don't forget to change when switching to production
const SUMSUB_BASE_URL = process.env.SUMSUB_BASE_URL;
const levelName = process.env.SUMSUB_LEVELNAME;

var config = {};
config.baseURL = SUMSUB_BASE_URL;

axios.interceptors.request.use(createSignature, function (error) {
  return Promise.reject(error);
});

function createSignature(config) {
  console.log("Creating a signature for the request...");

  var ts = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac("sha256", SUMSUB_SECRET_KEY);
  signature.update(ts + config.method.toUpperCase() + config.url);

  if (config.data instanceof FormData) {
    signature.update(config.data.getBuffer());
  } else if (config.data) {
    signature.update(config.data);
  }

  config.headers["X-App-Access-Ts"] = ts;
  config.headers["X-App-Access-Sig"] = signature.digest("hex");

  return config;
}

function createApplicant(externalUserId, levelName, fixedInfo) {
  console.log("Creating an applicant...");

  var method = "post";
  var url = "/resources/applicants?levelName=" + levelName;
  var ts = Math.floor(Date.now() / 1000);

  var body = {
    externalUserId: externalUserId,
    fixedInfo: fixedInfo,
  };

  var headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-App-Token": SUMSUB_APP_TOKEN,
  };

  config.method = method;
  config.url = url;
  config.headers = headers;
  config.data = JSON.stringify(body);

  return config;
}

exports.createApplicant = asyncHandler(async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const { externalUserId, fixedInfo } = req.body;
    let response = await axios(
      createApplicant(externalUserId, levelName, fixedInfo)
    );
    if (response) {
      console.log("Response:\n", response.data);
      if (role === "user") {
        let userData = await UserModel.findByIdAndUpdate(
          { _id: id },
          { applicantId: response.data.id }
        );
        if (userData) {
          res.status(201).json({ success: true });
        } else {
          res.status(401).json({ success: false });
        }
      } else {
        let validatorData = await ValidatorModel.findByIdAndUpdate(
          { _id: id },
          { applicantId: response.data.id }
        );
        if (validatorData) {
          res.status(201).json({ success: true });
        } else {
          res.status(401).json({ success: false });
        }
      }
      res.status(201).json({ success: true, data: response.data });
    } else {
      res.status(401).json({ success: false, data: {} });
    }
  } catch (err) {
    res.status(400).json({
      success: false,
      err,
    });
  }
});

function createAccessToken(
  externalUserId,
  levelName = "basic-kyc-level",
  ttlInSecs = 600
) {
  console.log("Creating an access token for initializng SDK...");

  var method = "post";
  var url = `/resources/accessTokens?userId=${externalUserId}&ttlInSecs=${ttlInSecs}&levelName=${levelName}`;

  var headers = {
    Accept: "application/json",
    "X-App-Token": SUMSUB_APP_TOKEN,
  };

  config.method = method;
  config.url = url;
  config.headers = headers;
  config.data = null;

  return config;
}

exports.createAccessToken = asyncHandler(async (req, res, next) => {
  try {
    const { externalUserId } = req.body;
    let response = await axios(
      createAccessToken(externalUserId, levelName, 1200)
    );
    if (response) {
      console.log("Response:\n", response.data);
      res.status(201).json({ success: true, data: response.data });
    } else {
      res.status(401).json({ success: false, data: {} });
    }
  } catch (err) {
    res.status(400).json({ success: false, err });
  }
});

function getApplicantStatus(applicantId) {
  console.log("Getting the applicant status...");

  var method = "get";
  var url = `/resources/applicants/${applicantId}/status`;

  var headers = {
    Accept: "application/json",
    "X-App-Token": SUMSUB_APP_TOKEN,
  };

  config.method = method;
  config.url = url;
  config.headers = headers;
  config.data = null;

  return config;
}

exports.getApplicantStatus = asyncHandler(async (req, res, next) => {
  try {
    const { applicantId } = req.params;
    let response = await axios(getApplicantStatus(applicantId));
    if (response) {
      res.status(201).json({ success: true, data: response.data });
    } else {
      res.status(401).json({ success: false, data: {} });
    }
  } catch (err) {
    res.status(400).json({ success: false, err });
  }
});