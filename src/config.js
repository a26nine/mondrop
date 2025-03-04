/**
 * Configuration module for MonDrop
 */

import dotenv from "dotenv";

dotenv.config();

export const config = {
  // Network configuration
  chainId: 10143,
  networkName: "Monad Testnet",
  networkShortName: "monad-testnet",
  currencyDecimals: 18,
  currencyName: "Monad",
  currencySymbol: "MON",
  rpcUrl: process.env.RPC_URL || "https://testnet-rpc.monad.xyz/",
  blockExplorerUrl: "https://testnet.monadexplorer.com/",
  gasPrice: 51n * 10n ** 9n, // 51 gwei in wei (fixed gas price)

  // Drop configuration
  batchPeriod: 5000, // Time between batches in milliseconds
  addressesPerBatch: 10, // Number of addresses to drop tokens to in a batch
  amountPerDrop: 0.1, // Amount of tokens to drop per address in a batch

  // Logging configuration
  logLevel: "INFO", // Logging level ('DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE')
};
