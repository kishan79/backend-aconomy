const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validateReqSchema");
const { collectionCreateReqSchema } = require("../utils/validateReq");
const { protect, authorize } = require("../middlewares/auth");
const advancedResults = require("../middlewares/advancedResults");
const CollectionModel = require("../models/Collection");
const { collectionSelectQuery } = require("../utils/selectQuery");

const collectionController = require("../controllers/collectionController");

router
  .route("/")
  .get(
    // protect,
    // authorize("user"),
    // advancedResults(CollectionModel, collectionSelectQuery),
    collectionController.fetchCollections
  )
  .post(
    protect,
    authorize("user"),
    validate(collectionCreateReqSchema),
    collectionController.createCollection
  );

router.route("/public").get(collectionController.fetchPublicCollections);

router
  .route("/:collectionId")
  .get(collectionController.fetchCollection)
  .put(protect, authorize("user"), collectionController.updateCollection);

router
  .route("/:collectionId/nft")
  .get(collectionController.fetchAllCollectionNfts);

router
  .route("/:collectionId/activities")
  .get(collectionController.fetchCollectionActivities);

module.exports = router;
