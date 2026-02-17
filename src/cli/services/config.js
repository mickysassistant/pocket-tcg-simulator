/**
 * Config Service
 * 
 * Manages persistent configuration storage for the tcgp CLI.
 * Stores config in ~/.tcgp/config.json by default.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Default configuration values
const DEFAULT_CONFIG = {
  // Default values go here
  'editor': 'vi',
  'theme': 'dark',
  'language': 'en',
  'timezone': Intl.DateTimeFormat().resolvedOptions().timeZone
};

/**
 * Get the config directory path
 * @returns {string} Path to config directory
 */
function getConfigDir() {
  // Use XDG_CONFIG_HOME if set, otherwise ~/.config
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome) {
    return path.join(xdgConfigHome, 'tcgp');
  }
  // Fallback to home directory
  return path.join(os.homedir(), '.tcgp');
}

/**
 * Get the config file path
 * @returns {string} Path to config file
 */
function getConfigPath() {
  return path.join(getConfigDir(), 'config.json');
}

/**
 * Ensure config directory exists
 * @throws {Error} If directory cannot be created
 */
function ensureConfigDir() {
  const configDir = getConfigDir();
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
}

/**
 * Read config from file
 * @returns {Object} Config object
 * @throws {Error} If file cannot be read
 */
function readConfig() {
  const configPath = getConfigPath();
  
  if (!fs.existsSync(configPath)) {
    // Return empty config if file doesn't exist
    return {};
  }
  
  const content = fs.readFileSync(configPath, 'utf8');
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in config file: ${error.message}`, {
      cause: 'INVALID_CONFIG_JSON'
    });
  }
}

/**
 * Write config to file
 * @param {Object} config - Config object to write
 * @throws {Error} If file cannot be written
 */
function writeConfig(config) {
  ensureConfigDir();
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Get a config value
 * @param {string} key - Config key
 * @returns {*} Config value or undefined if not found
 */
function get(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('Config key must be a non-empty string', {
      cause: 'INVALID_KEY'
    });
  }
  
  const config = readConfig();
  if (key in config) {
    return config[key];
  }
  
  // Return default if available
  if (key in DEFAULT_CONFIG) {
    return DEFAULT_CONFIG[key];
  }
  
  return undefined;
}

/**
 * Set a config value
 * @param {string} key - Config key
 * @param {*} value - Config value
 * @throws {Error} If parameters are invalid
 */
function set(key, value) {
  if (!key || typeof key !== 'string') {
    throw new Error('Config key must be a non-empty string', {
      cause: 'INVALID_KEY'
    });
  }
  
  const config = readConfig();
  config[key] = value;
  writeConfig(config);
}

/**
 * Get all config values (including defaults)
 * @returns {Object} All config values
 */
function getAll() {
  const config = readConfig();
  const result = {};
  
  // Start with defaults
  for (const key of Object.keys(DEFAULT_CONFIG)) {
    result[key] = DEFAULT_CONFIG[key];
  }
  
  // Override with stored values
  for (const key of Object.keys(config)) {
    result[key] = config[key];
  }
  
  return result;
}

/**
 * Set multiple config values at once
 * @param {Object} values - Config values to set
 * @throws {Error} If parameters are invalid
 */
function setAll(values) {
  if (!values || typeof values !== 'object') {
    throw new Error('Config values must be an object', {
      cause: 'INVALID_VALUES'
    });
  }
  
  const config = readConfig();
  for (const key of Object.keys(values)) {
    config[key] = values[key];
  }
  writeConfig(config);
}

/**
 * Delete a config value
 * @param {string} key - Config key to delete
 * @throws {Error} If parameters are invalid
 */
function deleteKey(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('Config key must be a non-empty string', {
      cause: 'INVALID_KEY'
    });
  }
  
  const config = readConfig();
  delete config[key];
  writeConfig(config);
}

/**
 * Reset config to defaults (clears all stored values)
 */
function reset() {
  writeConfig({});
}

/**
 * Get default values
 * @returns {Object} Default config values
 */
function getDefaults() {
  return { ...DEFAULT_CONFIG };
}

/**
 * Export config service API
 */
module.exports = {
  get,
  set,
  getAll,
  setAll,
  deleteKey,
  reset,
  getDefaults,
  getConfigDir,
  getConfigPath
};
