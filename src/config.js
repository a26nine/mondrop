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

  // Time interval configuration (in seconds)
  blockFetchInterval: 2, // How often to check for new blocks // Keep this low to avoid hitting rate limits
  dropInterval: 10, // How often to drop tokens
  transactionProcessingInterval: 1, // How long to wait for transactions to be processed after selection
  cacheCleanupInterval: 10, // How often to clean up the cache // Should be less than or equal to dropInterval
  logStatusInterval: 60, // How often to log statuses

  // Drop configuration
  addressesPerBatch: 50, // How many addresses to drop tokens to per batch
  amountPerDrop: 0.0001, // How much $MON to drop per address per batch
  cooldownBatches: 30, // How many batches to wait before dropping tokens again to the same address // Total time before dropping tokens to the same address is dropInterval * cooldownBatches

  // Logging configuration
  logLevel: "INFO", // Logging level ('TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE')
};
