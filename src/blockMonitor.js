import { config } from "./config.js";
import { logger } from "./logger.js";
import { scheduleTask } from "./timeManager.js";
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
  batch: {
    batchSize: 10, // Don't change this unless you know what you're doing
  },
});

let lastProcessedBlock = null;
let newBlocksBuffer = [];
let isProcessingBlocks = false;

/**
 * Get the latest block number from the network
 * @returns {Promise<bigint>} Latest block number
 */
export async function getLatestBlockNumber() {
  try {
    const blockNumber = await publicClient.getBlockNumber();
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
  logger.block(`Fetching blocks from ${startBlock} to ${endBlock}...`);

  const promises = [];
  for (let i = startBlock; i <= endBlock; i++) {
    promises.push(getBlockByNumber(i));
  }

  try {
    const blocks = await Promise.all(promises);
    return blocks;
  } catch (error) {
    logger.error(`Error fetching blocks in range: ${error.message}`);
    throw error;
  }
}

/**
 * Check for new blocks and add them to the buffer
 * @returns {Promise<void>}
 */
export async function checkForNewBlocks() {
  try {
    const currentBlock = await getLatestBlockNumber();

    if (lastProcessedBlock === null) {
      lastProcessedBlock = currentBlock;
      logger.info(`Block monitor initialized at block ${currentBlock}`);
      return;
    }

    if (currentBlock > lastProcessedBlock) {
      logger.debug(
        `New blocks detected: ${lastProcessedBlock + 1n} to ${currentBlock}`
      );

      const newBlocks = await getBlocksInRange(
        lastProcessedBlock + 1n,
        currentBlock
      );

      for (const block of newBlocks) {
        // Import here to avoid circular dependency
        const { extractAddressesFromBlocks } = await import(
          "./addressParser.js"
        );
        const { filterContractAddresses } = await import(
          "./addressSelector.js"
        );

        const addresses = extractAddressesFromBlocks([block]);
        if (addresses.length > 0) {
          filterContractAddresses(addresses).catch((err) => {
            logger.debug(
              `Error checking contract status for addresses: ${err.message}`
            );
          });
        }
      }

      newBlocksBuffer.push(...newBlocks);
      logger.debug(
        `Added ${newBlocks.length} blocks to buffer (Total buffer size: ${newBlocksBuffer.length} blocks)`
      );

      lastProcessedBlock = currentBlock;
      logger.block(`Processed addresses till block ${lastProcessedBlock}`);
    } else {
      logger.block(`No new blocks since ${lastProcessedBlock}`);
    }
  } catch (error) {
    logger.error(`Error checking for new blocks: ${error.message}`);
  }
}

/**
 * Process the block buffer using the provided callback
 * @param {Function} processBlocksFn - Callback for processing blocks
 * @returns {Promise<void>}
 */
export async function processBlockBuffer(processBlocksFn) {
  if (isProcessingBlocks || newBlocksBuffer.length === 0) {
    return;
  }

  isProcessingBlocks = true;
  try {
    const blocksToProcess = [...newBlocksBuffer];
    newBlocksBuffer = [];

    logger.debug(`Processing ${blocksToProcess.length} blocks from buffer...`);

    await processBlocksFn(blocksToProcess);

    logger.debug(`Processed ${blocksToProcess.length} blocks from buffer`);
  } catch (error) {
    logger.error(`Error processing block buffer: ${error.message}`);
  } finally {
    isProcessingBlocks = false;
  }
}

/**
 * Start the block monitoring and processing system
 * @param {Function} processBlocksFn - Function to call with new blocks
 * @returns {Promise<void>}
 */
export async function startBlockMonitor(processBlocksFn) {
  lastProcessedBlock = await getLatestBlockNumber();
  logger.info(`Block monitor initialized at block ${lastProcessedBlock}`);

  scheduleTask(
    "checkNewBlocks",
    checkForNewBlocks,
    config.blockFetchInterval * 1000
  );

  scheduleTask(
    "processDrop",
    async () => processBlockBuffer(processBlocksFn),
    config.dropInterval * 1000
  );
}
