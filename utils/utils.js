const Role = {
  user: "User",
  validator: "Validator",
};

const checkWhitelist = (obj) => {
  if (obj.lender_whitelisted && obj.borrower_whitelisted) {
    return "both";
  } else if (obj.lender_whitelisted) {
    return "lender";
  } else if (obj.borrower_whitelisted) {
    return "borrower";
  } else {
    return "none";
  }
};

const validateWhitelist = (obj, id, func) => {
  if (func === "makeoffer") {
    //lender
    if (obj.whitelist === "lender") {
      return obj.lenders.includes(id);
    } else if (obj.whitelist === "borrower") {
      return !obj.borrowers.includes(id);
    } else if (obj.whitelist === "both") {
      return obj.lenders.includes(id);
    } else {
      return true;
    }
  } else if (func === "requestLoan") {
    //borrower
    if (obj.whitelist === "lender") {
      return !obj.lenders.includes(id);
    } else if (obj.whitelist === "borrower") {
      return obj.borrowers.includes(id);
    } else if (obj.whitelist === "both") {
      return obj.borrowers.includes(id);
    } else {
      return true;
    }
  } else if (func === "acceptLoan") {
    //lender
    if (obj.whitelist === "lender") {
      return obj.lenders.includes(id);
    } else if (obj.whitelist === "borrower") {
      return !obj.borrowers.includes(id);
    } else if (obj.whitelist === "both") {
      // return obj.lenders.includes(id) || obj.borrowers.includes(id);
      return obj.lenders.includes(id);
    } else {
      return true;
    }
  } else {
    return true;
  }
};

module.exports = {
  Role,
  checkWhitelist,
  validateWhitelist,
};
