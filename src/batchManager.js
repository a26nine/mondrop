import { logger } from "./logger.js";

let currentBatch;
let dropCount;

/**
 * Initialize the batch manager
 *
 * @returns {void}
 */
export function initializeBatchManager() {
  logger.info(`Initializing batch manager...`);

  currentBatch = 1;
  dropCount = 0;
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
 * Get the current drop count
 *
 * @returns {number} Current drop count
 */
export function getDropCount() {
  return dropCount;
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

/**
 * Increment the drop count
 *
 * @returns {number} Incremented drop count
 */
export function incrementDropCount() {
  dropCount++;
  logger.info(`Total $MON drop rounds: ${dropCount}`);
  return dropCount;
}
