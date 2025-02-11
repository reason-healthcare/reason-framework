import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  dir: './',
})

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  modulePaths: ['<rootDir>/src/app'],
  moduleNameMapper: {
    '@/components/(.*)$': '<rootDir>/components/$1',
    '@/styles/(.*)$': '<rootDir>/styles/$1',
    '@/images/(.*)$': '<rootDir>/../public/images/$1',
    '^uuid$': require.resolve('uuid'),
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.jsx'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/jest-setup/jest.setup.ts'],
  verbose: true,
  silent: false,
}

export default createJestConfig(config)
