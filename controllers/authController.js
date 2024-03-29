// const UserModel = require("../models/User");
// const asyncHandler = require("../middlewares/async");
// const crypto = require("crypto");
// const { ethers } = require("ethers");
// const jwt = require("jsonwebtoken");

// exports.generateNonce = asyncHandler(async (req, res, next) => {
//   try {
//     const { wallet_address } = req.params;

//     const user = await UserModel.findOne({
//       wallet_address,
//     });

//     const signatureMessage = crypto.randomBytes(32).toString("hex");

//     if (!user) {
//       await UserModel.create({
//         wallet_address,
//         signatureMessage,
//       });
//     } else {
//       await UserModel.findOneAndUpdate(
//         { wallet_address },
//         { signatureMessage }
//       );
//     }

//     res.status(201).json({ success: true, signatureMessage });
//   } catch (err) {
//     res.status(400).json({ success: false });
//   }
// });

// exports.validateSignature = asyncHandler(async (req, res, next) => {
//   try {
//     const { wallet_address } = req.params;
//     const { signature } = req.body;
//     if (wallet_address.length && signature.length) {
//       const user = await UserModel.findOne({
//         wallet_address,
//       });

//       if (user) {
//         let signerAddr;
//         try {
//           signerAddr = await ethers.utils.verifyMessage(
//             user.signatureMessage,
//             signature
//           );
//         } catch (err) {
//           res.status(400).json({
//             success: false,
//             error: "Wrong signature",
//           });
//         }

//         if (signerAddr === wallet_address) {
//           const token = jwt.sign({ id: user._id, wallet_address, role: user.role }, process.env.JWT_SECRET, {
//             expiresIn: 60 * 60,
//           });
//           res.status(201).json({
//             success: true,
//             token,
//           });
//         } else {
//           res.status(400).json({
//             success: false,
//             error: "Wrong signature",
//           });
//         }
//       } else {
//         res.status(400).json({
//           success: false,
//           error: "Wrong wallet address",
//         });
//       }
//     } else {
//       res.status(400).json({
//         success: false,
//         error: "Wrong inputs given",
//       });
//     }
//   } catch (err) {
//     res.status(400).json({
//       success: false,
//     });
//   }
// });
