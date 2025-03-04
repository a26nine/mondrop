import { config } from "./config.js";
import { logger } from "./logger.js";
import { publicClient } from "./blockMonitor.js";

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
  logger.info(`Checking ${addresses.length} addresses for contracts...`);

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
 * Select random addresses from a list, excluding contracts
 *
 * @param {Array} addresses - List of addresses to select from
 * @param {number} count - Number of addresses to select (default from config)
 * @returns {Promise<Array>} Selected non-contract addresses
 */
export async function selectRandomAddresses(
  addresses,
  count = config.addressesPerBatch
) {
  const nonContractAddresses = await filterOutContracts(addresses);

  if (nonContractAddresses.length === 0) {
    logger.warn("No non-contract addresses available for selection");
    return [];
  }

  if (nonContractAddresses.length <= count) {
    logger.info(
      `Only ${nonContractAddresses.length} non-contract addresses available, returning all`
    );
    return nonContractAddresses;
  }

  const addressPool = [...nonContractAddresses];
  const selected = [];

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * addressPool.length);

    const [selectedAddress] = addressPool.splice(randomIndex, 1);
    selected.push(selectedAddress);
  }

  logger.info(
    `Selected ${selected.length} random non-contract addresses for the drop`
  );

  return selected;
}
