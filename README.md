# MonDrop

A NodeJS application that automatically rewards active users on Monad-Testnet with Testnet $MON.

## Features

- Real-time monitoring of Monad-Testnet blocks
- Random selection of active addresses from recent transactions, excluding contract addresses and recently selected wallet addresses
- Automated token distribution to selected addresses

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

## Architecture

The application follows a modular architecture:

- Batch Manager (`batchManager.js`): Manages the distribution of tokens in batches
- Cache Manager (`cacheManager.js`): Manages the cache of recently queried contract addresses and selected wallet addresses
- Block Monitor (`blockMonitor.js`): Tracks new blocks and fetches transaction data
- Address Parser (`addressParser.js`): Extracts unique addresses from transactions
- Address Selector (`addressSelector.js`): Filters and randomly selects recipient addresses excluding contracts and recently selected addresses
- Token Sender (`tokenSender.js`): Handles Testnet $MON distribution
- Logger (`logger.js`): Provides comprehensive logging
- Config (`config.js`): Centralizes all configurable parameters
- Main (`main.js`): Orchestrates the entire process

## Notes

- At higher `batchPeriod`, the tool will require an unrestricted or higher RPC rate limit to avoid rate limiting errors.

## License

UNLICENSED

## Disclaimer

This tool is meant for Testnet use with Monad-Testnet only. Always be cautious with private keys and ensure you're using the correct network settings.
