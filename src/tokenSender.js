import dotenv from "dotenv";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { parseEther, createWalletClient, http } from "viem";
import { privateKeyToAccount, nonceManager } from "viem/accounts";
import { monadTestnet } from "./blockMonitor.js";

dotenv.config();

let account;
let walletClient;

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

  logger.info(`Wallet configured with address: ${account.address}`);
}

/**
 * Send tokens to multiple addresses
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

  const amount = parseEther(config.amountPerDrop.toFixed(8));

  logger.info(
    `Preparing to send ${config.amountPerDrop.toFixed(8)} ${
      config.currencySymbol
    } to ${addresses.length} addresses`
  );

  const transactionPromises = addresses.map(async (to) => {
    try {
      const hash = await walletClient.sendTransaction({
        to,
        value: amount,
        gasPrice: config.gasPrice,
      });

      logger.tx(
        `✅ Sent ${config.amountPerDrop.toFixed(8)} MON to ${to} in tx: ${hash}`
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
    `Token drop complete: ${successful} successful, ${failed} failed`
  );

  return transactions;
}
