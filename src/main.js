import { config } from "./config.js";
import { logger } from "./logger.js";
import { initializeWallet, sendTokens } from "./tokenSender.js";
import { initializeBatchManager } from "./batchManager.js";
import { initializeCacheManager } from "./cacheManager.js";
import { startBlockMonitor } from "./blockMonitor.js";
import { extractAddressesFromBlocks } from "./addressParser.js";
import { selectRandomAddresses } from "./addressSelector.js";
import { clearAllScheduledTasks } from "./timeManager.js";

/**
 * Process the block data and initiate token distribution
 *
 * @param {Array} blocks - Array of blocks to process
 */
async function processBlocks(blocks) {
  try {
    const addresses = extractAddressesFromBlocks(blocks);

    if (addresses.length === 0) {
      logger.info("No active addresses found in the new blocks. Skipping...");
      return;
    }

    const selectedAddresses = await selectRandomAddresses(addresses);

    if (selectedAddresses.length === 0) {
      logger.info("No suitable wallet addresses found. Skipping...");
      return;
    }

    sendTokens(selectedAddresses).catch((error) => {
      logger.error(`Error during $MON drop: ${error.message}`);
    });
  } catch (error) {
    logger.error(`Error processing blocks: ${error.message}`);
  }
}

/**
 * Initialize required services
 */
async function initialize() {
  try {
    console.log("=".repeat(78));
    console.log(`🚀 Starting MonDrop...`);
    console.log(
      `💰 Dropping ${config.amountPerDrop.toFixed(8)} MON to ${
        config.addressesPerBatch
      } active addresses every ${config.dropInterval}s`
    );
    console.log("=".repeat(78) + "\n");

    await initializeWallet();
    initializeBatchManager();
    initializeCacheManager();

    return true;
  } catch (error) {
    logger.error(`Initialization failed: ${error.message}`);
    return false;
  }
}

/**
 * Main function to start MonDrop
 */
async function startMonDrop() {
  process.on("uncaughtException", (error) => {
    logger.error(`Uncaught exception: ${error.message}`);
    logger.error(error.stack);

    clearAllScheduledTasks();
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error(`Unhandled rejection at: ${promise}`);
    logger.error(`Reason: ${reason}`);
  });

  try {
    const initialized = await initialize();
    if (!initialized) {
      logger.error("Failed to initialize services. Exiting...");
      process.exit(1);
    }

    logger.info("Starting block monitor...");
    await startBlockMonitor(processBlocks);
  } catch (error) {
    logger.error(`Fatal error: ${error.message}. Exiting...`);
    clearAllScheduledTasks();
    process.exit(1);
  }
}

if (import.meta.url.endsWith(process.argv[1])) {
  startMonDrop().catch((error) => {
    logger.error(`Failed to start MonDrop: ${error.message}. Exiting...`);
    clearAllScheduledTasks();
    process.exit(1);
  });
}

export { startMonDrop };
