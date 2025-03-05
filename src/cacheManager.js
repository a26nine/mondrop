import { config } from "./config.js";
import { logger } from "./logger.js";
import { scheduleTask } from "./timeManager.js";

const walletAddressCache = new Set();
const walletAddressExpirationCache = new Map();
const contractAddressCache = new Map();
const contractAddressExpirationCache = new Map();

let currentWalletAddressCacheBatch = 1;
let currentContractAddressCacheBatch = 1;

/**
 * Initialize the cache management system
 */
export function initializeCacheManager() {
  logger.info("Initializing cache manager...");

  scheduleTask(
    "cacheCleanup",
    async () => {
      currentWalletAddressCacheBatch++;
      currentContractAddressCacheBatch++;
      cleanupWalletAddressCache(currentWalletAddressCacheBatch, true);
    },
    config.cacheCleanupInterval * 1000
  );

  scheduleTask(
    "logCacheStats",
    async () => {
      logger.info(
        `[STATUS] Cache stats: Wallet addresses=${walletAddressCache.size}, Contract addresses=${contractAddressCache.size}`
      );
    },
    config.logStatusInterval * 1000
  );
}

/**
 * Get current wallet cache batch number
 *
 * @returns {number} Current wallet cache batch number
 */
export function getCurrentWalletAddressCacheBatch() {
  return currentWalletAddressCacheBatch;
}

/**
 * Get current contract cache batch number
 *
 * @returns {number} Current contract cache batch number
 */
export function getCurrentContractAddressCacheBatch() {
  return currentContractAddressCacheBatch;
}

/**
 * Add or extend expiry for a contract address in the cache
 *
 * @param {string} address - Contract address to add or extend in the cache
 * @param {number} currentBatch - Current batch number (optional)
 * @param {boolean} isNewContract - Whether this is a newly discovered contract
 */
export function updateContractAddressCache(
  address,
  currentBatch = getCurrentContractAddressCacheBatch(),
  isNewContract = false
) {
  const normalizedAddress = address.toLowerCase();
  // 10x expiration period for contract addresses
  // TODO: Make this configurable
  const expirationBatch = currentBatch + config.cooldownBatches * 10;

  let wasExtended = false;
  let currentExpirationBatch = null;

  if (isNewContract) {
    contractAddressCache.set(normalizedAddress, true);
  }

  if (contractAddressCache.has(normalizedAddress)) {
    for (const [batch, addresses] of contractAddressExpirationCache.entries()) {
      if (addresses.has(normalizedAddress)) {
        currentExpirationBatch = batch;
        break;
      }
    }
  }

  if (currentExpirationBatch !== expirationBatch) {
    if (currentExpirationBatch !== null) {
      contractAddressExpirationCache
        .get(currentExpirationBatch)
        .delete(normalizedAddress);
      wasExtended = true;

      logger.trace(
        `Removed ${normalizedAddress} from contract address cache expiration batch ${currentExpirationBatch}`
      );

      if (
        contractAddressExpirationCache.get(currentExpirationBatch).size === 0
      ) {
        contractAddressExpirationCache.delete(currentExpirationBatch);
      }
    }

    if (!contractAddressExpirationCache.has(expirationBatch)) {
      contractAddressExpirationCache.set(expirationBatch, new Set());
    }
    contractAddressExpirationCache.get(expirationBatch).add(normalizedAddress);

    if (isNewContract) {
      logger.trace(
        `Added new contract ${normalizedAddress} to cache, with expiration at batch ${expirationBatch}`
      );
    } else if (wasExtended) {
      logger.trace(
        `Extended contract ${normalizedAddress} expiry to batch ${expirationBatch}`
      );
    }
  }
}

/**
 * Add a wallet address to the cache with an expiration batch
 *
 * @param {string} address - Wallet address to add to the cache
 * @param {number} currentBatch - Current batch number (optional)
 */
export function addToWalletAddressCache(
  address,
  currentBatch = getCurrentWalletAddressCacheBatch()
) {
  const normalizedAddress = address.toLowerCase();
  const expirationBatch = currentBatch + config.cooldownBatches;
  const isNewAddress = !walletAddressCache.has(normalizedAddress);

  let wasExtended = false;
  let currentExpirationBatch = null;

  if (!isNewAddress) {
    for (const [batch, addresses] of walletAddressExpirationCache.entries()) {
      if (addresses.has(normalizedAddress)) {
        currentExpirationBatch = batch;
        break;
      }
    }
  }

  if (currentExpirationBatch !== expirationBatch) {
    if (currentExpirationBatch !== null) {
      walletAddressExpirationCache
        .get(currentExpirationBatch)
        .delete(normalizedAddress);
      wasExtended = true;

      logger.trace(
        `Removed ${normalizedAddress} from wallet address cache expiration batch ${currentExpirationBatch}`
      );

      if (walletAddressExpirationCache.get(currentExpirationBatch).size === 0) {
        walletAddressExpirationCache.delete(currentExpirationBatch);
      }
    }

    walletAddressCache.add(normalizedAddress);

    if (!walletAddressExpirationCache.has(expirationBatch)) {
      walletAddressExpirationCache.set(expirationBatch, new Set());
    }
    walletAddressExpirationCache.get(expirationBatch).add(normalizedAddress);

    if (isNewAddress) {
      logger.trace(
        `Added new wallet ${normalizedAddress} to cache, with expiration at batch ${expirationBatch}`
      );
    } else if (wasExtended) {
      logger.trace(
        `Extended wallet ${normalizedAddress} expiry to batch ${expirationBatch}`
      );
    }
  }
}

/**
 * Clean up contract addresses that have expired in the current batch
 *
 * @param {number} currentBatch - Current batch number
 */
export function cleanupContractAddressCache(
  currentBatch = getCurrentContractAddressCacheBatch()
) {
  logger.trace(`Cleaning up contract cache for batch ${currentBatch}...`);

  if (contractAddressExpirationCache.has(currentBatch)) {
    const addressesToRemove = contractAddressExpirationCache.get(currentBatch);
    logger.debug(
      `Found ${addressesToRemove.size} contract addresses to remove from cache for batch ${currentBatch}`
    );
    addressesToRemove.forEach((addr) => {
      contractAddressCache.delete(addr);
      logger.trace(`Removed ${addr} from contract cache`);
    });
    contractAddressExpirationCache.delete(currentBatch);
  }

  logger.debug(
    `Contract cache cleanup complete (Current cache size: ${contractAddressCache.size})`
  );
}

/**
 * Clean up wallet addresses that have expired in the current batch
 *
 * @param {number} currentBatch - Current batch number
 * @param {boolean} cleanupContracts - Whether to also clean up contract cache
 */
export function cleanupWalletAddressCache(
  currentBatch = getCurrentWalletAddressCacheBatch(),
  cleanupContracts = false
) {
  logger.trace(`Cleaning up wallet address cache for batch ${currentBatch}...`);

  if (walletAddressExpirationCache.has(currentBatch)) {
    const addressesToRemove = walletAddressExpirationCache.get(currentBatch);
    logger.debug(
      `Found ${addressesToRemove.size} wallet addresses to remove from cache for batch ${currentBatch}`
    );
    addressesToRemove.forEach((addr) => {
      walletAddressCache.delete(addr);
      logger.trace(`Removed ${addr} from address cache`);
    });
    walletAddressExpirationCache.delete(currentBatch);
  }

  logger.debug(
    `Address cache cleanup complete (Current cache size: ${walletAddressCache.size})`
  );

  if (cleanupContracts) {
    cleanupContractAddressCache(currentBatch);
  }
}

/**
 * Check if an contract address is in the cache
 *
 * @param {string} address - Contract address to check
 * @returns {boolean} True if the contract address is in the cache
 */
export function isContractAddressInCache(address) {
  return contractAddressCache.has(address.toLowerCase());
}

/**
 * Get contract address from cache
 *
 * @param {string} address - Contract address to get
 * @returns {boolean} Value from the cache
 */
export function getContractAddressFromCache(address) {
  return contractAddressCache.get(address.toLowerCase());
}

/**
 * Check if an address is in the wallet cache
 *
 * @param {string} address - Wallet address to check
 * @returns {boolean} True if the wallet address is in the cache
 */
export function isWalletAddressInCache(address) {
  return walletAddressCache.has(address.toLowerCase());
}

/**
 * Get the size of the wallet address cache
 *
 * @returns {number} Size of the wallet address cache
 */
export function getWalletAddressCacheSize() {
  return walletAddressCache.size;
}
