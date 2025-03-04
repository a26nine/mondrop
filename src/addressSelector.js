import { config } from "./config.js";
import { logger } from "./logger.js";
import { getCurrentBatch } from "./batchManager.js";
import { publicClient } from "./blockMonitor.js";

const activeAddresses = new Set();
const expirationCache = new Map();

/**
 * Check if an address is a contract
 *
 * @param {string} address - Address to check
 * @returns {Promise<boolean>} True if the address is a contract
 */
export async function isContract(address) {
  try {
    const code = await publicClient.getCode({ address });
    // If code length is greater than '0x' (empty), it's a contract
    return code && code.length > 2;
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
export async function filterOutContracts(addresses) {
  logger.debug(`Checking ${addresses.length} addresses for contracts...`);

  const results = await Promise.all(
    addresses.map(async (address) => {
      const isContractAddress = await isContract(address);
      return { address, isContract: isContractAddress };
    })
  );

  const nonContractAddresses = results
    .filter((item) => !item.isContract)
    .map((item) => item.address);

  const filteredCount = addresses.length - nonContractAddresses.length;
  if (filteredCount > 0) {
    logger.info(`Filtered out ${filteredCount} contract addresses`);
  }

  return nonContractAddresses;
}

/**
 * Add an address to the cache with an expiration batch
 *
 * @param {string} address - Address to add to the cache
 * @param {number} currentBatch - Current batch number
 */
function addToCache(address, currentBatch) {
  const normalizedAddress = address.toLowerCase();
  const expirationBatch = currentBatch + config.cooldownBatches;

  activeAddresses.add(normalizedAddress);
  logger.debug(
    `Added ${normalizedAddress} to cache, with expiration at batch ${expirationBatch}`
  );

  if (!expirationCache.has(expirationBatch)) {
    expirationCache.set(expirationBatch, new Set());
  }
  expirationCache.get(expirationBatch).add(normalizedAddress);
}

/**
 * Clean up addresses that have expired in the current batch
 *
 * @param {number} currentBatch - Current batch number
 */
function cleanupCache(currentBatch) {
  logger.debug(`Cleaning up cache for batch ${currentBatch}...`);

  if (expirationCache.has(currentBatch)) {
    const addressesToRemove = expirationCache.get(currentBatch);
    logger.debug(
      `Found ${addressesToRemove.size} addresses to remove from cache for batch ${currentBatch}`
    );
    addressesToRemove.forEach((addr) => {
      activeAddresses.delete(addr);
      logger.debug(`Removed ${addr} from cache`);
    });
    expirationCache.delete(currentBatch);
  }

  logger.debug(
    `Cache cleanup complete (cache size after cleanup: ${activeAddresses.size})`
  );
}

/**
 * Shuffle an array in place using the Fisher-Yates algorithm
 *
 * @param {Array} addresses - Addresses array to shuffle
 */
function shuffle(addresses) {
  for (let i = addresses.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [addresses[i], addresses[j]] = [addresses[j], addresses[i]];
  }
}

/**
 * Select random addresses from a list, excluding contracts and recently selected addresses
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
  logger.debug(`Starting selection for batch ${currentBatch}...`);

  const nonContractAddresses = await filterOutContracts(addresses);
  if (nonContractAddresses.length === 0) {
    logger.warn("No non-contract addresses available for selection");
    return [];
  }

  cleanupCache(currentBatch);

  logger.debug(
    `Filtering out ${activeAddresses.size} recently selected addresses...`
  );

  const eligibleAddresses = [];

  nonContractAddresses.forEach((addr) => {
    const lowerAddress = addr.toLowerCase();

    if (activeAddresses.has(lowerAddress)) {
      logger.debug(`Address ${addr} is filtered out`);
    } else {
      eligibleAddresses.push(addr);
    }
  });

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
      addToCache(addr, currentBatch);
    });

    return eligibleAddresses;
  }

  shuffle(nonContractAddresses);

  const selected = nonContractAddresses.slice(0, count);

  selected.forEach((addr) => addToCache(addr, currentBatch));

  logger.info(`Selected ${selected.length} random addresses for the drop`);
  return selected;
}
