const PoolModel = require("../models/Pool");
const asyncHandler = require("../middlewares/async");

exports.getPools = asyncHandler(async(req,res, next) => {
  try {
    res.status(200).json(res.advancedResults);
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
      message: "Failed to execute",
    });
  }
});

exports.createPool = asyncHandler(async (req, res, next) => {
  try {
    const poolData = await PoolModel.create(req.body);
    res.status(201).json({
      success: true,
      data: poolData,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: [],
    });
  }
});


exports.makeoffer = asyncHandler(async(req,res,next) => {
  try{
    const {pool_id} = req.params
    const data = await PoolModel.update({_id:req.params.pool_id},{
      '$push': {
        "offers": {pool_id,amount:500, status: true, apy_precent: 10, duration: 30, expireOn: "Sat Feb 18 2023 13:22:31 GMT+0530"}
     }
    })
    res.status(201).json({
      success: true,
      data
    })
  }catch(err){
    res.status(400).json({
      success: false,
      data: [],
    });
  }
})
