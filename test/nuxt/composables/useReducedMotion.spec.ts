import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useReducedMotion } from '~/composables/useReducedMotion'

describe('useReducedMotion', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks()
  })

  it('should return prefersReducedMotion as false by default', () => {
    // Mock matchMedia to return false
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const { prefersReducedMotion } = useReducedMotion()
    expect(prefersReducedMotion.value).toBe(false)
  })

  it('should return prefersReducedMotion as true when user prefers reduced motion', () => {
    // Mock matchMedia to return true
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const { prefersReducedMotion } = useReducedMotion()
    expect(prefersReducedMotion.value).toBe(true)
  })

  it('should update when media query changes', () => {
    let mediaQueryListener: ((event: MediaQueryListEvent) => void) | undefined

    // Mock matchMedia with ability to trigger change event
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            mediaQueryListener = listener
          }
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const { prefersReducedMotion } = useReducedMotion()
    expect(prefersReducedMotion.value).toBe(false)

    // Simulate media query change
    if (mediaQueryListener) {
      mediaQueryListener({ matches: true } as MediaQueryListEvent)
      expect(prefersReducedMotion.value).toBe(true)
    }
  })
})
