/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/dist/'],
  // The first screen test in a file renders the whole route tree on a cold transform cache, which
  // takes longer than Jest's 5 s default on CI runners. A test that times out keeps running and
  // its act() scopes then overlap every later test in the file.
  testTimeout: 20_000,
  // d3 resolves to .mjs, which jest cannot load; use each package's UMD build.
  moduleNameMapper: {
    '^(d3-[a-z-]+|internmap)$': '<rootDir>/node_modules/$1/dist/$1.js',
  },
};
