const express = require("express");
const router = express.Router();
const advancedResults = require("../middlewares/advancedResults");
const PoolModel = require("../models/Pool");
const { protect, authorize } = require("../middlewares/auth");
const { poolSelectQuery, userSelectQuery } = require("../utils/selectQuery");

const poolController = require("../controllers/poolController");

router.route("/").get(
  advancedResults(PoolModel, poolSelectQuery, [
    {
      path: "pool_owner",
      select:
        "-assetType -bio -email -signatureMessage -document -createdAt -updatedAt -__v -username -role",
    },
    { path: "lenders", select: userSelectQuery },
    { path: "borrowers", select: userSelectQuery },
  ]),
  poolController.getPools
);
router.route("/:poolId").get(poolController.fetchPool);
router
  .route("/:poolId/addLender")
  .post(protect, authorize("validator"), poolController.addLender);
router
  .route("/:poolId/removeLender")
  .delete(protect, authorize("validator"), poolController.removeLender);
router
  .route("/:poolId/addBorrower")
  .post(protect, authorize("validator"), poolController.addBorrower);
router
  .route("/:poolId/removeBorrower")
  .delete(protect, authorize("validator"), poolController.removeBorrower);
router
  .route("/create")
  .post(protect, authorize("validator"), poolController.createPool);
router
  .route("/:pool_id/makeoffer")
  .post(protect, authorize("user", "validator"), poolController.makeoffer);
router
  .route("/:pool_id/acceptOffer/:bid_id")
  .post(protect, authorize("validator"), poolController.acceptOffer);
router
  .route("/:pool_id/rejectOffer/:bid_id")
  .post(protect, authorize("validator"), poolController.rejectOffer);
router
  .route("/:pool_id/repayOffer/:bid_id")
  .post(protect, authorize("validator"), poolController.repayOffer);
router.route("/:pool_id/lenderOffers").get(poolController.fetchLenderOffers);
router
  .route("/:pool_id/requestLoan")
  .post(protect, authorize("user", "validator"), poolController.requestLoan);
router
  .route("/:pool_id/acceptLoan/:loan_id")
  .post(protect, authorize("user", "validator"), poolController.acceptLoan);
router
  .route("/:pool_id/repayLoan/:loan_id")
  .post(protect, authorize("user", "validator"), poolController.repayLoan);
router.route("/:pool_id/loanRequests").get(poolController.fetchLoanRequests);
router.route("/:pool_id/filledOffers").get(poolController.fetchFilledOffers);
module.exports = router;
