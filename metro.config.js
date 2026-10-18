const fs = require('fs');
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // npm links the local @egym/capacitor-mwa-navigation folder into node_modules; Metro follows links only into watched folders.
  watchFolders: [
    fs.realpathSync(
      path.join(__dirname, 'node_modules/@egym/capacitor-mwa-navigation'),
    ),
  ],
  // Metro resolves the linked package's imports, such as react-native, from its real folder, which has none of them.
  resolver: {
    nodeModulesPaths: [path.join(__dirname, 'node_modules')],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
