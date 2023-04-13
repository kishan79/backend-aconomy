const express = require("express");
const router = express.Router();
const advancedResults = require("../middlewares/advancedResults");
const PoolModel = require("../models/Pool");
const { protect, authorize } = require("../middlewares/auth");
const { poolSelectQuery, userSelectQuery } = require("../utils/selectQuery");

const poolController = require("../controllers/poolController");

router.route("/").get(
  advancedResults(PoolModel, poolSelectQuery, [
    { path: "pool_owner", select: userSelectQuery },
    { path: "lenders", select: userSelectQuery },
    { path: "borrowers", select: userSelectQuery },
  ]),
  poolController.getPools
);
router.route("/:poolId").get(poolController.fetchPool);
router
  .route("/:poolId/addLender")
  .post(protect, authorize("user"), poolController.addLender);
router
  .route("/:poolId/addBorrower")
  .post(protect, authorize("user"), poolController.addBorrower);
router
  .route("/create")
  .post(protect, authorize("user"), poolController.createPool);
router
  .route("/:pool_id/makeoffer")
  .post(protect, authorize("user"), poolController.makeoffer);
router
  .route("/:pool_id/acceptOffer/:bid_id")
  .post(protect, authorize("user"), poolController.acceptOffer);
router
  .route("/:pool_id/requestLoan")
  .post(protect, authorize("user"), poolController.requestLoan);
module.exports = router;
