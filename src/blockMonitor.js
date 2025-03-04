/**
 * Block monitor module for MonDrop
 * Fetches blocks and monitors chain for new transactions
 */

import { config } from "./config.js";
import { logger } from "./logger.js";
import { createPublicClient, http, defineChain } from "viem";

export const monadTestnet = defineChain({
  id: config.chainId,
  name: config.networkName,
  network: config.networkShortName,
  nativeCurrency: {
    decimals: config.currencyDecimals,
    name: config.currencyName,
    symbol: config.currencySymbol,
  },
  rpcUrls: {
    default: {
      http: [config.rpcUrl],
    },
    public: {
      http: [config.rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: config.blockExplorerUrl,
    },
  },
});

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

/**
 * Get the latest block number from the chain
 * @returns {Promise<bigint>} Latest block number
 */
export async function getLatestBlockNumber() {
  try {
    const blockNumber = await publicClient.getBlockNumber();
    logger.block(`Latest block number: ${blockNumber}`);
    return blockNumber;
  } catch (error) {
    logger.error(`Error fetching latest block number: ${error.message}`);
    throw error;
  }
}

/**
 * Get a block by its number with full transaction details
 * @param {bigint} blockNumber - Block number to fetch
 * @returns {Promise<object>} Block with transactions
 */
export async function getBlockByNumber(blockNumber) {
  try {
    const block = await publicClient.getBlock({
      blockNumber,
      includeTransactions: true,
    });
    logger.debug(
      `Fetched block: ${blockNumber}, with ${block.transactions.length} transactions`
    );
    return block;
  } catch (error) {
    logger.error(`Error fetching block ${blockNumber}: ${error.message}`);
    throw error;
  }
}

/**
 * Get multiple blocks in a range
 * @param {bigint} startBlock - Starting block number (inclusive)
 * @param {bigint} endBlock - Ending block number (inclusive)
 * @returns {Promise<Array>} Array of blocks with transactions
 */
export async function getBlocksInRange(startBlock, endBlock) {
  logger.block(`Fetching blocks from ${startBlock} to ${endBlock}`);

  const promises = [];
  for (let i = startBlock; i <= endBlock; i++) {
    promises.push(getBlockByNumber(i));
  }

  try {
    const blocks = await Promise.all(promises);
    logger.block(`Successfully fetched ${blocks.length} blocks`);
    return blocks;
  } catch (error) {
    logger.error(`Error fetching blocks in range: ${error.message}`);
    throw error;
  }
}

/**
 * Sleep for a specified amount of time
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Continuously monitor for new blocks and process them
 * @param {Function} processBlocksFn - Function to call with new blocks
 * @returns {Promise<void>}
 */
export async function startBlockMonitor(processBlocksFn) {
  let lastProcessedBlock = await getLatestBlockNumber();
  logger.info(`Block monitor starting from block: ${lastProcessedBlock}`);

  while (true) {
    try {
      await sleep(config.batchPeriod);

      const currentBlock = await getLatestBlockNumber();

      if (currentBlock > lastProcessedBlock) {
        logger.block(
          `New blocks detected: ${lastProcessedBlock + 1n} to ${currentBlock}`
        );

        const newBlocks = await getBlocksInRange(
          lastProcessedBlock + 1n,
          currentBlock
        );

        processBlocksFn(newBlocks);

        lastProcessedBlock = currentBlock;
      } else {
        logger.debug(`No new blocks since ${lastProcessedBlock}`);
      }
    } catch (error) {
      logger.error(`Error in block monitor: ${error.message}`);

      await sleep(5000);
    }
  }
}
