# MonDrop

A NodeJS application that automatically rewards active users on Monad-Testnet with Testnet $MON.

## Features

- Real-time monitoring of Monad-Testnet blocks
- Random selection of active addresses from recent transactions, excluding contract addresses and recently selected wallet addresses
- Automated token distribution to selected addresses
- Configurable time intervals for all operations

## Prerequisites

- Node.js (`v18` or higher)
- Private key of a wallet with sufficient Testnet $MON on Monad-Testnet

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory (see `.env.example` for reference)
4. Adjust the configuration in the `src/config.js` file to match your requirements

## Usage

Start the application:

```bash
npm start
```

## Configuration

The application is highly configurable through the `src/config.js` file:

### Network Configuration

```javascript
chainId: 10143,
networkName: "Monad Testnet",
networkShortName: "monad-testnet",
currencyDecimals: 18,
currencyName: "Monad",
currencySymbol: "MON",
rpcUrl: process.env.RPC_URL || "https://testnet-rpc.monad.xyz/",
blockExplorerUrl: "https://testnet.monadexplorer.com/",
gasPrice: 51n * 10n ** 9n, // 51 gwei in wei (fixed gas price)
```

### Time Interval Configuration

```javascript
blockFetchInterval: 2, // How often to check for new blocks // Keep this low to avoid hitting rate limits
dropInterval: 10, // How often to drop tokens
transactionProcessingInterval: 1, // How long to wait for transactions to be processed after selection
cacheCleanupInterval: 10, // How often to clean up the cache // Should be less than or equal to dropInterval
logStatusInterval: 60, // How often to log statuses
```

### Drop Configuration

```javascript
addressesPerBatch: 50, // How many addresses to drop tokens to per batch
amountPerDrop: 0.1, // How much $MON to drop per address per batch
cooldownBatches: 30, // How many batches to wait before dropping tokens again to the same address // Total time before dropping tokens to the same address is dropInterval * cooldownBatches
```

### Logging Configuration

```javascript
logLevel: "INFO", // Logging level ('TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE')
```

## Architecture

The application follows a modular architecture with distributed processing:

- **Time Manager** (`timeManager.js`): Schedules and manages all timed operations
- **Block Monitor** (`blockMonitor.js`): Fetches and buffers new blocks continuously
- **Address Parser** (`addressParser.js`): Extracts unique addresses from blocks
- **Address Selector** (`addressSelector.js`): Intelligently selects recipients with optimized contract detection
- **Cache Manager** (`cacheManager.js`): Maintains separate caches for contracts and wallets with different lifetimes
- **Token Sender** (`tokenSender.js`): Handles token distribution with transaction queuing
- **Batch Manager** (`batchManager.js`): Tracks distribution cycles
- **Config** (`config.js`): Centralizes all configurable parameters
- **Main** (`main.js`): Orchestrates the entire process

## Optimized Operation

MonDrop uses several optimizations for efficient operation:

1. **Distributed Processing**: Operations happen at different intervals to spread out the load
2. **Immediate Contract Detection**: Addresses are checked for being contracts as soon as blocks arrive
3. **Smart Caching**: Separate caches for contracts and wallets with optimized lifetimes
4. **Transaction Queuing**: Backpressure handling for token distribution
5. **Cache-First Selection**: Address selection prioritizes using cached data to minimize RPC calls

## License

UNLICENSED

## Disclaimer

This tool is meant for Testnet use with Monad-Testnet only. Always be cautious with private keys and ensure you're using the correct network settings.
