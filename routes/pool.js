const express = require("express");
const router = express.Router();
const advancedResults = require("../middlewares/advancedResults");
const PoolModel = require("../models/Pool");
const { protect, authorize } = require("../middlewares/auth");
const { poolSelectQuery, userSelectQuery } = require("../utils/selectQuery");

const poolController = require("../controllers/poolController");

router.route("/").get(
  advancedResults(PoolModel, poolSelectQuery, [
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
router.route("/:pool_id/makeoffer").post(poolController.makeoffer);

module.exports = router;
