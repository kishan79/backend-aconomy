const { validationResult } = require("express-validator");

const validate = (schemas) => {
  return async (req, res, next) => {
    await Promise.all(schemas.map((schema) => schema.run(req)));

    const result = validationResult(req);
    console.log("result", result);
    if (result.isEmpty()) {
      return next();
    }

    const errors = result.array();
    let errData = errors.map((err)=> err.msg); 
    return res.status(401).json({error: errData});
  };
};

module.exports = validate;
