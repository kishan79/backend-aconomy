const userSelectQuery =
  "-signatureMessage -createdAt -updatedAt -__v -termOfService";
const validatorSelectQuery = "-signatureMessage -createdAt -updatedAt -__v";
const collectionSelectQuery = "-createdAt -updatedAt -__v";
const nftSelectQuery = "-updatedAt -__v";
const activitySelectQuery = "_id user asset assetCollection createdAt statusText";
const nftActivitySelectQuery = "name assetType mediaLinks _id";
const userHistorySelectQuery = "-__v -signatureMessage -termOfService -email -createdAt -updatedAt";
const validatorHistorySelectQuery = "-signatureMessage -createdAt -updatedAt -__v -document -email -bio -assetType";
const validatedAssetSelectQuery = "-updatedAt -__v -assetJurisdiction";
const poolSelectQuery = "-updatedAt -__v";
const redeemNftSelectQuery = "_id name nftOwner nftOwnerType createdAt redeemRequest validationId updatedAt mediaLinks assetType _id"

module.exports = {
  userSelectQuery,
  validatorSelectQuery,
  collectionSelectQuery,
  nftSelectQuery,
  activitySelectQuery,
  nftActivitySelectQuery,
  userHistorySelectQuery,
  validatorHistorySelectQuery,
  validatedAssetSelectQuery,
  poolSelectQuery,
  redeemNftSelectQuery
};
