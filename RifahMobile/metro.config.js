const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure we use this project only (no accidental router/app from other packages)
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

module.exports = config;
