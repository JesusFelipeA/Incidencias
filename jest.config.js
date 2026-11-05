module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: { '^.+/config/env$': '<rootDir>/__tests__/support/env.ts' },
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/support/'],
};
