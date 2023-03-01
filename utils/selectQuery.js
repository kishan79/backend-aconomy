const userSelectQuery = "-signatureMessage -createdAt -updatedAt -__v -termOfService -email";
const validatorSelectQuery = "-signatureMessage -createdAt -updatedAt -__v";
const collectionSelectQuery = "-createdAt -updatedAt -__v";
const nftSelectQuery = "-createdAt -updatedAt -__v -assetJurisdiction";

module.exports = {
    userSelectQuery,
    validatorSelectQuery,
    collectionSelectQuery,
    nftSelectQuery
}