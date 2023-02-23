const { body } = require("express-validator");

const userValidSignature = [
  body("signature", "The signature field is required").notEmpty(),
];

const validatorValidSignature = [
  body("signature", "The signature field is required").notEmpty(),
]

const validatorOnBoardReqSchema = [
  body("email", "Enter valid email").isEmail().normalizeEmail(),
  body("email", "The email field is required").notEmpty(),
  body("username", "The username field is required").notEmpty(),
  body("name", "The name field is required").notEmpty(),
  body("address", "The address field is required").notEmpty(),
];

const userOnBoardReqSchema = [
  body("name", "The name field is required").notEmpty(),
  body("username", "The username field is required").notEmpty(),
  body("term", "The term field must be true").toBoolean().isIn([true]),
];

module.exports = {
  userValidSignature,
  validatorValidSignature,
  validatorOnBoardReqSchema,
  userOnBoardReqSchema,
};
