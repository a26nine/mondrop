import { config } from "./config.js";

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
  TRACE: -1,
};

let currentLogLevel = LogLevel[config.logLevel];

export const logger = {
  /**
   * Set the current logging level
   * @param {string} level - Logging level ('DEBUG', 'INFO', 'WARN', 'ERROR', 'NONE')
   */
  setLogLevel: (level) => {
    if (level in LogLevel) {
      currentLogLevel = LogLevel[level];
    }
  },

  /**
   * Get the current logging level
   * @returns {string} Current logging level
   */
  getLogLevel: () => {
    return Object.keys(LogLevel).find(
      (key) => LogLevel[key] === currentLogLevel
    );
  },

  /**
   * Log information message
   * @param {string} message - Message to log
   */
  info: (message) => {
    if (currentLogLevel <= LogLevel.INFO) {
      console.log(
        `${colors.blue}[INFO]   ${
          colors.reset
        } ${new Date().toISOString()} ${message}`
      );
    }
  },

  /**
   * Log success message
   * @param {string} message - Message to log
   */
  success: (message) => {
    console.log(
      `${colors.green}[SUCCESS]${
        colors.reset
      } ${new Date().toISOString()} ${message}`
    );
  },

  /**
   * Log error message
   * @param {string} message - Message to log
   */
  error: (message) => {
    if (currentLogLevel <= LogLevel.ERROR) {
      console.error(
        `${colors.red}[ERROR]  ${
          colors.reset
        } ${new Date().toISOString()} ${message}`
      );
    }
  },

  /**
   * Log warning message
   * @param {string} message - Message to log
   */
  warn: (message) => {
    if (currentLogLevel <= LogLevel.WARN) {
      console.warn(
        `${colors.yellow}[WARN]   ${
          colors.reset
        } ${new Date().toISOString()} ${message}`
      );
    }
  },

  /**
   * Log debug message
   * @param {string} message - Message to log
   */
  debug: (message) => {
    if (currentLogLevel <= LogLevel.DEBUG) {
      console.debug(
        `${colors.white}[DEBUG]  ${
          colors.reset
        } ${new Date().toISOString()} ${message}`
      );
    }
  },

  /**
   * Log trace message
   * @param {string} message - Message to log
   */
  trace: (message) => {
    if (currentLogLevel <= LogLevel.TRACE) {
      // This is set to debug to skip stack traces
      console.debug(
        `${colors.white}[TRACE]  ${
          colors.reset
        } ${new Date().toISOString()} ${message}`
      );
    }
  },

  /**
   * Log block information
   * @param {string} message - Message to log
   */
  block: (message) => {
    console.log(
      `${colors.cyan}[BLOCK]  ${
        colors.reset
      } ${new Date().toISOString()} ${message}`
    );
  },

  /**
   * Log transaction information
   * @param {string} message - Message to log
   */
  tx: (message) => {
    console.log(
      `${colors.green}[TX]     ${
        colors.reset
      } ${new Date().toISOString()} ${message}`
    );
  },
};
