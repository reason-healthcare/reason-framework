import '@testing-library/jest-dom'

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}))

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => undefined,
}))

// antd uses window.matchMedia for responsive hooks — jsdom doesn't include it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
})
