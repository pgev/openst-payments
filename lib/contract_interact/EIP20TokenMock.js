//"use strict";

/**
 *
 * This is a utility file which would be used for executing all methods on Pricer contract.<br><br>
 *
 * @module lib/contract_interact/pricer
 *
 */

const openSTStorage = require('@openstfoundation/openst-storage')
;

const rootPrefix = '../..'
  , helper = require(rootPrefix + '/lib/contract_interact/helper')
  , coreAddresses = require(rootPrefix + '/config/core_addresses')
  , web3Provider = require(rootPrefix + '/lib/web3/providers/ws')
  , gasLimitGlobalConstant = require(rootPrefix + '/lib/global_constant/gas_limit')
  , ddbServiceObj = require(rootPrefix + '/lib/dynamoDB_service')
  , autoScalingServiceObj = require(rootPrefix + '/lib/auto_scaling_service')
  , basicHelper = require(rootPrefix + '/helpers/basic_helper')
  , logger = require(rootPrefix + '/helpers/custom_console_logger')
;

const contractName = 'eip20tokenmock'
  , contractAbi = coreAddresses.getAbiForContract(contractName)
  , currContract = new web3Provider.eth.Contract(contractAbi)
;


/**
 * @constructor
 *
 */
const MockToken = module.exports = function (mockTokenAddress) {
  this.contractAddress = mockTokenAddress;
};

MockToken.prototype = {

  /**
  * Get balance of address
  *
  * @param {String} ownerAddress - address for which balance is to be fetched
  *
  * @return {Promise}
  *
  */
  balanceOf: async function (ownerAddress) {
    const transactionObject = currContract.methods.balanceOf(ownerAddress);
    const encodedABI = transactionObject.encodeABI();
    const transactionOutputs = helper.getTransactionOutputs(transactionObject);
    const response = await helper.call(web3Provider, this.contractAddress, encodedABI, {}, transactionOutputs);
    return Promise.resolve(response[0]);
  },

  /**
  * Set balance
  *
  * @param {string} senderAddr - address of user who is sending amount
  * @param {string} senderPassphrase - sender address passphrase
  * @param {string} ownerAddress - address for which balance is to be set
  * @param {BigNumber} value - amount which is being transferred (in wei)
  * @param {BigNumber} gasPrice - gas price
  *
  * @return {Promise}
  *
  */
  setBalance: function (senderAddress, senderPassphrase, ownerAddress, value, gasPrice) {
    const oThis = this;

    if (!gasPrice) {
      return Promise.reject('GasPrice is mandatory');
    }
    helper.assertAddress(ownerAddress);
    helper.assertAddress(senderAddress);

    currContract.options.address = oThis.contractAddress;
    //currContract.setProvider( web3Provider.currentProvider );
    const transactionObject = currContract.methods.setBalance(ownerAddress, value);
    const encodedABI = transactionObject.encodeABI();
    return helper.safeSendFromAddr(
      web3Provider,
      oThis.contractAddress,
      encodedABI,
      senderAddress,
      senderPassphrase,
      { gasPrice: gasPrice, gas: gasLimitGlobalConstant.default() }
    ).then(async function(transactionReceipt) {
      // set balance in dynamo and cache.
      const balanceUpdateResponse = await new openSTStorage.TokenBalanceModel({
        ddb_service: ddbServiceObj,
        auto_scaling: autoScalingServiceObj,
        erc20_contract_address: oThis.contractAddress
      }).set({
        ethereum_address: ownerAddress,
        settle_amount: basicHelper.convertToBigNumber(value).toString(10),
        pessimistic_settled_balance: basicHelper.convertToBigNumber(value).toString(10),
        un_settled_debit_amount: basicHelper.convertToBigNumber(0).toString(10),
      }).catch(function (error) {
        logger.error('lib/contract_interact/EIP20TokenMock.js:set Balance inside catch:', error);
      });
      return Promise.resolve(transactionReceipt);
    });
  },

  /**
  * Set conversion rate
  *
  * @param {string} senderAddr - address of sender
  * @param {string} senderPassphrase - passphrase of sender
  * @param {number} conversionRate - conversion rate of branded token
  * @param {BigNumber} gasPrice - gas price
  *
  * @return {Promise}
  *
  */
  setConversionRate: function (senderAddress, senderPassphrase, conversionRate, gasPrice) {
    if (!gasPrice) {
      return Promise.reject('GasPrice is mandatory');
    }
    helper.assertAddress(senderAddress);

    currContract.options.address = this.contractAddress;
    //currContract.setProvider( web3Provider.currentProvider );
    const transactionObject = currContract.methods.setConverionRate(conversionRate);
    const encodedABI = transactionObject.encodeABI();
    return helper.safeSendFromAddr(
      web3Provider,
      this.contractAddress,
      encodedABI,
      senderAddress,
      senderPassphrase,
      { gasPrice: gasPrice, gas: gasLimitGlobalConstant.default() }
    ).then(function(transactionReceipt) {
      return Promise.resolve(transactionReceipt);
    });
  },

  /**
  * Approve
  *
  * @param {string} senderAddr - address of sender
  * @param {string} senderPassphrase - passphrase of sender
  * @param {string} spenderAddress - address which will be approved for spending
  * @param {BigNumber} value - amount which is being approved (in wei)
  * @param {BigNumber} gasPrice - gas price
  *
  * @return {Promise}
  *
  */
  approve: function (senderAddress, senderPassphrase, spenderAddress, value, gasPrice) {
    if (!gasPrice) {
      return Promise.reject('GasPrice is mandatory');
    }
    helper.assertAddress(senderAddress);
    helper.assertAddress(spenderAddress);

    currContract.options.address = this.contractAddress;
    //currContract.setProvider( web3Provider.currentProvider );
    const transactionObject = currContract.methods.approve(spenderAddress, value);
    const encodedABI = transactionObject.encodeABI();
    return helper.safeSendFromAddr(
      web3Provider,
      this.contractAddress,
      encodedABI,
      senderAddress,
      senderPassphrase,
      { gasPrice: gasPrice, gas: gasLimitGlobalConstant.default() }
    ).then(function(transactionReceipt) {
      return Promise.resolve(transactionReceipt);
    });
  }

};

