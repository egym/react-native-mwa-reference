module.exports = {
  dependencies: {
    // Only the Android Portals register SQLite, as in the native reference apps.
    '@capacitor-community/sqlite': {
      platforms: {
        ios: null,
      },
    },
  },
};
