import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Points to the Next.js app root so next/jest can read next.config and .env files
  dir: './',
})

const config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleDirectories: ['node_modules', '<rootDir>/src/app'],
  moduleNameMapper: {
    '^@/types/(.*)$': '<rootDir>/src/app/types/$1',
    '^@/components/(.*)$': '<rootDir>/src/app/components/$1',
    '^@/styles/(.*)$': '<rootDir>/src/app/styles/$1',
    '^@/images/(.*)$': '<rootDir>/src/public/images/$1',
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  collectCoverageFrom: ['src/app/**/*.{ts,tsx}', '!src/app/**/*.d.ts'],
}

export default createJestConfig(config)
