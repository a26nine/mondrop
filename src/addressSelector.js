import { config } from "./config.js";
import { logger } from "./logger.js";
import { getCurrentBatch } from "./batchManager.js";
import { publicClient } from "./blockMonitor.js";
import {
  isAddressInContractCache,
  getContractAddressFromCache,
  updateContractCache,
  cleanupAddressCache,
  addToAddressCache,
  isAddressInWalletCache,
  getWalletAddressCacheSize,
} from "./cacheManager.js";

/**
 * Check if an address is a contract
 *
 * @param {string} address - Address to check
 * @returns {Promise<boolean>} True if the address is a contract
 */
export async function isContractAddress(address) {
  const normalizedAddress = address.toLowerCase();

  if (isAddressInContractCache(normalizedAddress)) {
    const currentBatch = getCurrentBatch();

    logger.debug(`Cache hit for contract ${normalizedAddress}`);
    updateContractCache(normalizedAddress, currentBatch, false);

    return getContractAddressFromCache(normalizedAddress);
  }

  try {
    const code = await publicClient.getCode({
      address: address,
      blockTag: "latest",
    });
    // If code length is greater than '0x' (empty), it's a contract
    const isContract = code && code.length > 2;

    if (isContract) {
      const currentBatch = getCurrentBatch();
      updateContractCache(normalizedAddress, currentBatch, true);
    }

    return isContract;
  } catch (error) {
    logger.warn(
      `Error checking if address ${address} is a contract: ${error.message}`
    );
    // If we can't determine, assume it's not a contract to be safe
    return false;
  }
}

/**
 * Filter out contract addresses from a list
 *
 * @param {Array} addresses - List of addresses to filter
 * @returns {Promise<Array>} Non-contract addresses
 */
export async function filterContractAddresses(addresses) {
  logger.debug(`Checking ${addresses.length} addresses for contracts...`);

  const results = await Promise.all(
    addresses.map(async (address) => {
      const isContractResult = await isContractAddress(address);
      return { address, isContractAddress: isContractResult };
    })
  );

  const nonContractAddresses = results
    .filter((item) => !item.isContractAddress)
    .map((item) => item.address);

  const filteredCount = addresses.length - nonContractAddresses.length;
  if (filteredCount > 0) {
    logger.info(`Filtered out ${filteredCount} contract addresses`);
  }

  return nonContractAddresses;
}

/**
 * Shuffle an array in place using the Fisher-Yates algorithm
 *
 * @param {Array} addresses - Addresses array to shuffleAddresses
 */
function shuffleAddresses(addresses) {
  for (let i = addresses.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [addresses[i], addresses[j]] = [addresses[j], addresses[i]];
  }
}

/**
 * Select random addresses from a list, excluding contracts addresses and recently selected wallet addresses
 *
 * @param {Array} addresses - List of addresses to select from
 * @param {number} count - Number of addresses to select
 * @param {number} currentBatch - Current batch number
 * @returns {Promise<Array>} Selected non-contract addresses
 */
export async function selectRandomAddresses(
  addresses,
  count = config.addressesPerBatch,
  currentBatch = getCurrentBatch()
) {
  logger.info(`Starting selection for batch ${currentBatch}...`);

  const nonContractAddresses = await filterContractAddresses(addresses);
  if (nonContractAddresses.length === 0) {
    logger.warn("No non-contract addresses available for selection");
    return [];
  }

  // This will also clean up the contract cache
  if (currentBatch > 1) {
    cleanupAddressCache(currentBatch, true);
  }

  const eligibleAddresses = [];

  nonContractAddresses.forEach((addr) => {
    const lowerAddress = addr.toLowerCase();

    if (isAddressInWalletCache(lowerAddress)) {
      addToAddressCache(lowerAddress, currentBatch);
      logger.debug(`Address ${addr} is filtered out`);
    } else {
      eligibleAddresses.push(addr);
    }
  });

  if (currentBatch > 1) {
    logger.info(
      `Filtered out ${getWalletAddressCacheSize()} recently selected wallet addresses`
    );
  }
  logger.info(`${eligibleAddresses.length} addresses eligible for selection`);

  if (eligibleAddresses.length === 0) {
    logger.warn(
      "No eligible addresses available after filtering recent selections"
    );

    return [];
  }

  if (eligibleAddresses.length <= count) {
    logger.warn(
      `Only ${eligibleAddresses.length} eligible addresses available for selection`
    );

    eligibleAddresses.forEach((addr) => {
      addToAddressCache(addr, currentBatch);
    });

    return eligibleAddresses;
  }

  // Fix: shuffle the eligible addresses instead of nonContractAddresses
  shuffleAddresses(eligibleAddresses);

  const selected = eligibleAddresses.slice(0, count);

  selected.forEach((addr) => addToAddressCache(addr, currentBatch));

  logger.debug(`Selected ${selected.length} random addresses for the drop`);
  return selected;
}
