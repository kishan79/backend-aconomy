const userSelectQuery =
  "-signatureMessage -createdAt -updatedAt -__v -termOfService -email";
const validatorSelectQuery = "-signatureMessage -createdAt -updatedAt -__v";
const collectionSelectQuery = "-createdAt -updatedAt -__v";
const nftSelectQuery = "-updatedAt -__v -assetJurisdiction";
const activitySelectQuery = "-_id -updatedAt -__v";
const nftActivitySelectQuery = "name assetType mediaLinks -_id";
const userHistorySelectQuery = "_id name";
const validatorHistorySelectQuery = "_id name";
const validatedAssetSelectQuery = "-updatedAt -__v -assetJurisdiction";

module.exports = {
  userSelectQuery,
  validatorSelectQuery,
  collectionSelectQuery,
  nftSelectQuery,
  activitySelectQuery,
  nftActivitySelectQuery,
  userHistorySelectQuery,
  validatorHistorySelectQuery,
  validatedAssetSelectQuery
};
