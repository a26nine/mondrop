import dotenv from "dotenv";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { scheduleTask } from "./timeManager.js";
import { monadTestnet, publicClient } from "./blockMonitor.js";
import { incrementBatch } from "./batchManager.js";
import { incrementDropCount } from "./batchManager.js";
import { parseEther, createWalletClient, http } from "viem";
import { privateKeyToAccount, nonceManager } from "viem/accounts";

dotenv.config();

let account;
let walletClient;
let isProcessingSend = false;
let transactionQueue = [];

/**
 * Initialize wallet from private key
 * @returns {Promise<void>}
 */
export async function initializeWallet() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    throw new Error(
      "Private key not found. Set the PRIVATE_KEY environment variable."
    );
  }

  account = privateKeyToAccount(PRIVATE_KEY, { nonceManager });

  walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  });

  logger.info(`Drop wallet configured with address: ${account.address}`);

  scheduleTask(
    "processTransactionQueue",
    processTransactionQueue,
    config.transactionProcessingInterval * 1000
  );

  scheduleTask(
    "checkWalletBalance",
    checkWalletBalance,
    config.logStatusInterval * 1000
  );
}

/**
 * Check wallet balance
 * @returns {Promise<void>}
 */
async function checkWalletBalance() {
  try {
    const balance = await publicClient.getBalance({
      address: account.address,
      blockTag: "latest",
    });
    const balanceInMon = Number(balance) / 10 ** 18;

    logger.info(`[STATUS] Wallet balance: ${balanceInMon.toFixed(4)} MON`);

    // Warn if balance is getting low (10x buffer)
    if (balanceInMon < config.addressesPerBatch * config.amountPerDrop * 10) {
      logger.warn(
        `Low wallet balance: ${balanceInMon.toFixed(
          4
        )} MON - Consider adding more funds`
      );
    }
  } catch (error) {
    logger.error(`Error checking wallet balance: ${error.message}`);
  }
}

/**
 * Process any transactions in the queue
 * @returns {Promise<void>}
 */
async function processTransactionQueue() {
  if (isProcessingSend || transactionQueue.length === 0) {
    return;
  }

  isProcessingSend = true;

  try {
    const batch = transactionQueue.shift();
    logger.debug(
      `Processing queued transaction batch with ${batch.addresses.length} addresses`
    );

    await processBatch(batch.addresses);
  } catch (error) {
    logger.error(`Error processing transaction queue: ${error.message}`);
  } finally {
    isProcessingSend = false;
  }
}

/**
 * Process a batch of transactions
 * @param {Array} addresses - Array of recipient addresses
 * @returns {Promise<Array>} Transaction results
 */
async function processBatch(addresses) {
  const amount = parseEther(config.amountPerDrop.toFixed(18));

  logger.info(
    `Sending ${config.amountPerDrop.toFixed(18)} ${config.currencySymbol} to ${
      addresses.length
    } random addresses...`
  );

  const transactionPromises = addresses.map(async (to) => {
    try {
      const hash = await walletClient.sendTransaction({
        to,
        value: amount,
        gasPrice: config.gasPrice,
      });

      logger.tx(
        `✅ Sent ${config.amountPerDrop.toFixed(
          18
        )} MON to ${to} in tx: ${hash}`
      );
      return { to, hash, status: "sent" };
    } catch (error) {
      logger.error(`❌ Failed to send to ${to}: ${error.message}`);
      return { to, status: "failed", error: error.message };
    }
  });

  const transactions = await Promise.all(transactionPromises);

  const successful = transactions.filter((tx) => tx.status === "sent").length;
  const failed = transactions.filter((tx) => tx.status === "failed").length;

  logger.success(
    `$MON drop complete: ${successful} successful, ${failed} failed`
  );

  incrementBatch();

  return transactions;
}

/**
 * Send tokens to multiple addresses (or queue them if a send is in progress)
 *
 * @param {Array} addresses - Array of recipient addresses
 * @returns {Promise<Array>} Transaction results
 */
export async function sendTokens(addresses) {
  if (!account || !walletClient) {
    throw new Error("Wallet not initialized. Call initializeWallet() first.");
  }

  if (!addresses || !addresses.length) {
    logger.warn("No addresses provided for dropping tokens");
    return [];
  }

  if (isProcessingSend) {
    logger.debug(
      `Queueing batch with ${addresses.length} addresses for later processing...`
    );
    transactionQueue.push({ addresses });
    return [];
  }

  isProcessingSend = true;

  try {
    return await processBatch(addresses);
  } finally {
    isProcessingSend = false;
    incrementDropCount();
  }
}
