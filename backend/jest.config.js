/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'], 
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', 
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  // Ignore build folders just in case
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/cdk.out/"
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(aws-sdk-client-mock-jest|@aws-sdk)/)'
  ],
};