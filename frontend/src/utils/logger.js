/**
 * Logger utility to control console logs throughout the application
 * Allows for easily enabling/disabling logs globally or by category
 */

// Set this to false to disable all logging
const ENABLE_LOGGING = false;

// Set specific categories for more granular control
const LOG_CATEGORIES = {
  API_CALLS: false,
  API_RESPONSES: false,
  USER_ACTIONS: false,
  PREDICTIONS: false,
  DEBUG: false,
  AUTHENTICATION: false,
  DEFAULT: false
};

/**
 * Custom logger that only outputs when logging is enabled
 * @param {*} message - The message or data to log
 * @param {*} data - Additional data to log (optional)
 * @param {string} category - Logging category for more granular control
 */
export const log = (message, data = null, category = 'DEFAULT') => {
  // Skip logging if disabled globally or the specific category is disabled
  if (!ENABLE_LOGGING || (category && LOG_CATEGORIES[category] === false)) {
    return;
  }
  
  if (data) {
    console.log(message, data);
  } else {
    console.log(message);
  }
};

/**
 * Error logger - always enabled for critical errors
 */
export const logError = (message, error = null) => {
  if (error) {
    console.error(message, error);
  } else {
    console.error(message);
  }
};

/**
 * Warning logger - can be disabled but separate from regular logs
 */
export const logWarning = (message, data = null) => {
  if (!ENABLE_LOGGING) {
    return;
  }
  
  if (data) {
    console.warn(message, data);
  } else {
    console.warn(message);
  }
};

export default {
  log,
  logError,
  logWarning
}; 