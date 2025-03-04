import { logger } from "./logger.js";

/**
 * Extract all unique addresses from a set of blocks
 * Gets both sender (from) and receiver (to) addresses
 *
 * @param {Array} blocks - Array of blocks with transactions
 * @returns {Array} Array of unique addresses
 */
export function extractAddressesFromBlocks(blocks) {
  const addresses = new Set();
  let txCount = 0;

  for (const block of blocks) {
    for (const tx of block.transactions) {
      txCount++;

      if (tx.from) {
        addresses.add(tx.from.toLowerCase());
      }

      if (tx.to) {
        addresses.add(tx.to.toLowerCase());
      }
    }
  }

  const uniqueAddresses = Array.from(addresses);

  logger.info(
    `Extracted ${uniqueAddresses.length} unique addresses from ${txCount} transactions`
  );

  return uniqueAddresses;
}
