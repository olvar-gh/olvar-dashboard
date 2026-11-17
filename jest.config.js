/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/dist/'],
  // d3 resolves to .mjs, which jest cannot load; use each package's UMD build.
  moduleNameMapper: {
    '^(d3-[a-z-]+|internmap)$': '<rootDir>/node_modules/$1/dist/$1.js',
  },
};
