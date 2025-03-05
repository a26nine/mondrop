import { logger } from "./logger.js";

const intervals = new Map();

/**
 * Schedule a task to run at a specific interval
 *
 * @param {string} taskName - Unique name for the task
 * @param {Function} taskFn - Function to execute
 * @param {number} intervalMs - Interval in milliseconds
 * @returns {number} Interval ID
 */
export function scheduleTask(taskName, taskFn, intervalMs) {
  if (intervals.has(taskName)) {
    clearInterval(intervals.get(taskName));
    logger.debug(`Rescheduled existing task: ${taskName}`);
  }

  logger.info(
    `Scheduling task "${taskName}" to run every ${intervalMs / 1000}s`
  );

  const intervalId = setInterval(async () => {
    try {
      await taskFn();
    } catch (error) {
      logger.error(`Error in scheduling task "${taskName}": ${error.message}`);
    }
  }, intervalMs);

  intervals.set(taskName, intervalId);
  return intervalId;
}

/**
 * Trigger a scheduled task immediately
 *
 * @param {string} taskName - Name of the task to trigger
 * @param {Function} taskFn - Function to execute if task doesn't exist
 * @returns {Promise<void>}
 */
export async function triggerTaskNow(taskName, taskFn) {
  logger.debug(`Triggering task "${taskName}" immediately...`);

  try {
    if (taskFn) {
      await taskFn();
    } else {
      logger.warn(`Task "${taskName}" does not have a function to trigger`);
    }
  } catch (error) {
    logger.error(`Error triggering task "${taskName}": ${error.message}`);
  }
}

/**
 * Clear a scheduled task
 *
 * @param {string} taskName - Name of the task to clear
 * @returns {boolean} True if task was cleared, false if it didn't exist
 */
export function clearScheduledTask(taskName) {
  if (intervals.has(taskName)) {
    clearInterval(intervals.get(taskName));
    intervals.delete(taskName);
    logger.debug(`Cleared scheduled task ${taskName}`);
    return true;
  }

  return false;
}

/**
 * Clear all scheduled tasks
 */
export function clearAllScheduledTasks() {
  for (const [taskName, intervalId] of intervals.entries()) {
    clearInterval(intervalId);
    logger.debug(`Cleared scheduled task ${taskName}`);
  }

  intervals.clear();
  logger.debug(`Cleared all scheduled tasks. Stopping...`);
}

process.on("SIGINT", () => {
  clearAllScheduledTasks();
  process.exit(0);
});

process.on("SIGTERM", () => {
  clearAllScheduledTasks();
  process.exit(0);
});
