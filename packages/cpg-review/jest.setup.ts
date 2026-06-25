import '@testing-library/jest-dom'

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}))

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => undefined,
}))

jest.mock('uuid', () => ({
  __esModule: true,
  v4: jest.fn(() => 'mock-uuid'),
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

Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: jest.fn(),
})

const originalGetComputedStyle = window.getComputedStyle.bind(window)
window.getComputedStyle = ((element: Element, pseudoElt?: string | null) => {
  if (pseudoElt) {
    const fallback = originalGetComputedStyle(element)
    const originalGetPropertyValue = fallback.getPropertyValue.bind(fallback)
    fallback.getPropertyValue = ((property: string) =>
      property
        ? originalGetPropertyValue(property)
        : '') as typeof fallback.getPropertyValue
    return fallback
  }

  return originalGetComputedStyle(element)
}) as typeof window.getComputedStyle
