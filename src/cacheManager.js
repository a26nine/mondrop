import { config } from "./config.js";
import { logger } from "./logger.js";

const walletAddressCache = new Set();
const walletAddressExpirationCache = new Map();
const contractAddressCache = new Map();
const contractAddressExpirationCache = new Map();

/**
 * Add or extend expiry for a contract address in the cache
 *
 * @param {string} address - Contract address to add or extend in the cache
 * @param {number} currentBatch - Current batch number
 * @param {boolean} isNewContract - Whether this is a newly discovered contract
 */
export function updateContractCache(
  address,
  currentBatch,
  isNewContract = false
) {
  // 10x expiration period for contract addresses
  // TODO: Make this configurable
  const expirationBatch = currentBatch + config.cooldownBatches * 10;
  let wasExtended = false;

  if (isNewContract) {
    contractAddressCache.set(address, true);
  }

  if (contractAddressCache.has(address)) {
    for (const [batch, addresses] of contractAddressExpirationCache.entries()) {
      if (addresses.has(address)) {
        addresses.delete(address);
        wasExtended = true;

        logger.trace(
          `Removed ${address} from contract expiration batch ${batch}`
        );

        if (addresses.size === 0) {
          contractAddressExpirationCache.delete(batch);
        }
        break;
      }
    }
  }

  if (!contractAddressExpirationCache.has(expirationBatch)) {
    contractAddressExpirationCache.set(expirationBatch, new Set());
  }
  contractAddressExpirationCache.get(expirationBatch).add(address);

  if (isNewContract) {
    logger.trace(
      `Added new contract ${address} to cache, with expiration at batch ${expirationBatch}`
    );
  } else if (wasExtended) {
    logger.trace(
      `Extended contract ${address} expiry to batch ${expirationBatch}`
    );
  }
}

/**
 * Add a wallet address to the cache with an expiration batch
 *
 * @param {string} address - Wallet address to add to the cache
 * @param {number} currentBatch - Current batch number
 */
export function addToAddressCache(address, currentBatch) {
  const normalizedAddress = address.toLowerCase();
  const expirationBatch = currentBatch + config.cooldownBatches;
  let wasExtended = false;
  const isNewAddress = !walletAddressCache.has(normalizedAddress);

  if (!isNewAddress) {
    for (const [batch, addresses] of walletAddressExpirationCache.entries()) {
      if (addresses.has(normalizedAddress)) {
        addresses.delete(normalizedAddress);
        wasExtended = true;
        logger.trace(
          `Removed ${normalizedAddress} from expiration batch ${batch} to extend expiry`
        );
        if (addresses.size === 0) {
          walletAddressExpirationCache.delete(batch);
        }
        break;
      }
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

/**
 * Clean up wallet addresses that have expired in the current batch
 *
 * @param {number} currentBatch - Current batch number
 * @param {boolean} cleanupContracts - Whether to also clean up contract cache
 */
export function cleanupAddressCache(currentBatch, cleanupContracts = true) {
  logger.trace(`Cleaning up address cache for batch ${currentBatch}...`);

  if (walletAddressExpirationCache.has(currentBatch)) {
    const addressesToRemove = walletAddressExpirationCache.get(currentBatch);
    logger.trace(
      `Found ${addressesToRemove.size} addresses to remove from cache for batch ${currentBatch}`
    );
    addressesToRemove.forEach((addr) => {
      walletAddressCache.delete(addr);
      logger.trace(`Removed ${addr} from address cache`);
    });
    walletAddressExpirationCache.delete(currentBatch);
  }

  logger.debug(
    `Address cache cleanup complete (current cache size: ${walletAddressCache.size})`
  );

  if (cleanupContracts) {
    cleanupContractCache(currentBatch);
  }
}

/**
 * Clean up contract addresses that have expired in the current batch
 *
 * @param {number} currentBatch - Current batch number
 */
export function cleanupContractCache(currentBatch) {
  logger.trace(`Cleaning up contract cache for batch ${currentBatch}...`);

  if (contractAddressExpirationCache.has(currentBatch)) {
    const addressesToRemove = contractAddressExpirationCache.get(currentBatch);
    logger.trace(
      `Found ${addressesToRemove.size} contract addresses to remove from cache for batch ${currentBatch}`
    );
    addressesToRemove.forEach((addr) => {
      contractAddressCache.delete(addr);
      logger.trace(`Removed ${addr} from contract cache`);
    });
    contractAddressExpirationCache.delete(currentBatch);
  }

  logger.debug(
    `Contract cache cleanup complete (current cache size: ${contractAddressCache.size})`
  );
}

/**
 * Check if an address is in the contract cache
 *
 * @param {string} address - Contract address to check
 * @returns {boolean} True if the address is in the contract cache
 */
export function isAddressInContractCache(address) {
  return contractAddressCache.has(address.toLowerCase());
}

/**
 * Get contract address from cache
 *
 * @param {string} address - Contract address to get
 * @returns {boolean} Value from the contract cache
 */
export function getContractAddressFromCache(address) {
  return contractAddressCache.get(address.toLowerCase());
}

/**
 * Check if an address is in the wallet cache
 *
 * @param {string} address - Wallet address to check
 * @returns {boolean} True if the address is in the wallet cache
 */
export function isAddressInWalletCache(address) {
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
