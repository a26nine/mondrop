import { logger } from "./logger.js";

let currentBatch;

/**
 * Initialize the batch manager
 *
 * @returns {number} Current batch number
 */
export function initializeBatch() {
  currentBatch = 1;
  logger.info(`Initializing batch manager with batch ${currentBatch}...`);
  return currentBatch;
}

/**
 * Get the current batch number
 *
 * @returns {number} Current batch number
 */
export function getCurrentBatch() {
  return currentBatch;
}

/**
 * Increment the current batch number
 *
 * @returns {number} Incremented batch number
 */
export function incrementBatch() {
  currentBatch++;
  logger.debug(`Batch number incremented to ${currentBatch}`);
  return currentBatch;
}
