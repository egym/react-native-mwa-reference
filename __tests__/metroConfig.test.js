const path = require('path');
const config = require('../metro.config');

test('Metro resolves the imports of the linked EGYM package from the app node_modules', () => {
  expect(config.resolver.nodeModulesPaths).toContain(
    path.join(__dirname, '..', 'node_modules'),
  );
});
