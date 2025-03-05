import { config } from "./config.js";
import { logger } from "./logger.js";
import { publicClient } from "./blockMonitor.js";
import {
  isContractAddressInCache,
  getContractAddressFromCache,
  updateContractAddressCache,
  isWalletAddressInCache,
  addToWalletAddressCache,
  getCurrentWalletAddressCacheBatch,
} from "./cacheManager.js";

/**
 * Check if an address is a contract
 *
 * @param {string} address - Address to check
 * @returns {Promise<boolean>} True if the address is a contract
 */
export async function isContractAddress(address) {
  const normalizedAddress = address.toLowerCase();

  if (isContractAddressInCache(normalizedAddress)) {
    logger.debug(`Cache hit for contract ${normalizedAddress}`);
    updateContractAddressCache(normalizedAddress);
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
      updateContractAddressCache(normalizedAddress, undefined, true);
    }

    return isContract;
  } catch (error) {
    logger.warn(
      `Error checking contract status for ${address}: ${error.message}`
    );
    // If we can't determine, assume it's not a contract to be safe
    return false;
  }
}

/**
 * Filter out contract addresses from a list and update the cache
 *
 * @param {Array} addresses - List of addresses to check
 * @returns {Promise<void>}
 */
export async function filterContractAddresses(addresses) {
  if (!addresses || addresses.length === 0) return;

  logger.debug(`Pre-checking ${addresses.length} addresses for contracts...`);

  const batchSize = 50; // Don't change this unless you know what you're doing
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);

    // Use Promise.allSettled to continue even if some checks fail
    const results = await Promise.allSettled(
      batch.map((address) => isContractAddress(address))
    );

    const contractsFound = results.filter(
      (result) => result.status === "fulfilled" && result.value === true
    ).length;

    if (contractsFound > 0) {
      logger.debug(
        `Found ${contractsFound} contracts in this batch of ${batch.length} addresses`
      );
    }
  }

  logger.debug(
    `Completed contract pre-checking for ${addresses.length} addresses`
  );
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
 * @returns {Promise<Array>} Selected non-contract addresses
 */
export async function selectRandomAddresses(
  addresses,
  count = config.addressesPerBatch
) {
  const preFilteredAddresses = [];
  const unknownContractStatus = [];

  for (const address of addresses) {
    const normalizedAddress = address.toLowerCase();

    if (
      isContractAddressInCache(normalizedAddress) &&
      getContractAddressFromCache(normalizedAddress) === true
    ) {
      continue;
    }

    if (isWalletAddressInCache(normalizedAddress)) {
      logger.debug(`Skipping ${address} as it's already in the cache`);
      continue;
    }

    if (isContractAddressInCache(normalizedAddress)) {
      preFilteredAddresses.push(address);
    } else {
      unknownContractStatus.push(address);
    }
  }

  logger.debug(
    `Found ${preFilteredAddresses.length} known wallet addresses from cache, while ${unknownContractStatus.length} addresses need contract status checked`
  );

  if (preFilteredAddresses.length >= count * 2) {
    logger.debug(
      `Using cached data only as sufficient wallet addresses are available`
    );
  } else if (unknownContractStatus.length > 0) {
    logger.debug(
      `Checking ${unknownContractStatus.length} addresses for contract status...`
    );

    const batchSize = 50; // Don't change this unless you know what you're doing
    for (let i = 0; i < unknownContractStatus.length; i += batchSize) {
      const batch = unknownContractStatus.slice(i, i + batchSize);

      const checkPromises = batch.map(async (address) => {
        try {
          const isContract = await isContractAddress(address);
          return { address, isContract };
        } catch (error) {
          logger.debug(
            `Error checking contract status for ${address}: ${error.message}`
          );
          // Assume it's a contract on error to be safe
          return { address, isContract: true };
        }
      });

      const results = await Promise.all(checkPromises);

      for (const result of results) {
        if (!result.isContract) {
          preFilteredAddresses.push(result.address);
        }
      }

      if (preFilteredAddresses.length >= count * 2) {
        logger.debug(
          `Gathered ${preFilteredAddresses.length} addresses from contract checks, stopping contract checks...`
        );
        break;
      }
    }
  }

  if (preFilteredAddresses.length === 0) {
    logger.warn("No eligible addresses available after filtering");
    return [];
  }

  shuffleAddresses(preFilteredAddresses);

  const finalCount = Math.min(count, preFilteredAddresses.length);
  const selected = preFilteredAddresses.slice(0, finalCount);

  selected.forEach((addr) => addToWalletAddressCache(addr));

  logger.debug(`Selected ${selected.length} random addresses for the drop`);
  return selected;
}
