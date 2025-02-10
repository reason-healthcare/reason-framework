import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  // preset: 'ts-jest',
  testEnvironment: 'jsdom',
  modulePaths: ["<rootDir>/src/app"],
  moduleNameMapper: {
      "@/components/(.*)$": "<rootDir>/components/$1",
      "@/styles/(.*)$": "<rootDir>/styles/$1",
      "@/images/(.*)$": "<rootDir>/../public/images/$1",
      "^uuid$": require.resolve('uuid'),
  },
  // transform: {
  //   // "^.+\\.tsx?$": "ts-jest", // Transform TypeScript files
  //   // "^.+\\.jsx?$": "babel-jest", // Transform JavaScript files
  // },
  extensionsToTreatAsEsm: [".ts", ".tsx", ".jsx"], // Treat JS/TS as ESM
  globals: {
    "ts-jest": {
      useESM: true, // Ensure ESM support in ts-jest
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/jest-setup/jest.setup.ts'],
  // transformIgnorePatterns: [
  //   "node_modules/(?!(react-markdown)/)"
  // ],
  verbose: true,
  silent: false,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)

