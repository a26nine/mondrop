# MonDrop

A NodeJS application that automatically rewards active users on the Monad Testnet with surprise MON token drops at regular intervals.

## Features

- Real-time monitoring of Monad Testnet blocks
- Random selection of active addresses (excluding contracts) from recent transactions
- Automated token distribution to selected addresses

## Prerequisites

- Node.js (`v18` or higher)
- Wallet with MON tokens on Monad Testnet

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

- Block Monitor (`blockMonitor.js`): Tracks new blocks and fetches transaction data
- Address Parser (`addressParser.js`): Extracts unique addresses from transactions
- Address Selector (`addressSelector.js`): Filters and randomly selects recipient addresses excluding contracts
- Token Sender (`tokenSender.js`): Handles MON token drops
- Logger (`logger.js`): Provides comprehensive logging
- Config (`config.js`): Centralizes all configurable parameters
- Main (`main.js`): Orchestrates the entire process

## License

UNLICENSED

## Disclaimer

This tool is meant for Testnet use only. Always be cautious with private keys and ensure you're using the correct network settings.
