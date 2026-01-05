/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
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
  // 1. CRITICAL: Ignore the cdk.out build artifacts
  testPathIgnorePatterns: [
    "/node_modules/", 
    "/cdk.out/" 
  ],
  // 2. Ensure we only run the Infrastructure tests in this folder
  testMatch: [
    "<rootDir>/test/**/*.test.ts" 
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(aws-sdk-client-mock-jest|@aws-sdk|aws-cdk-lib)/)'
  ],
};