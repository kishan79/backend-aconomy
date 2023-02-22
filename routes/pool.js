const express = require("express");
const router = express.Router();
const advancedResults = require('../middlewares/advancedResults');
const PoolModel = require('../models/Pool');
const { protect, authorize } = require("../middlewares/auth");

//import controllers
const poolController = require("../controllers/poolController");

// router.route('/').get(protect, authorize("validator"), advancedResults(PoolModel), poolController.getPools )
router.route('/').get(advancedResults(PoolModel), poolController.getPools )
router.route('/create').post(poolController.createPool);
router.route('/:pool_id/makeoffer').post(poolController.makeoffer)

module.exports = router;
