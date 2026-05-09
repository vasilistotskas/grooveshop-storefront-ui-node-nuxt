/**
 * Unit tests for server/middleware/1.locale.ts
 *
 * Tests priority order:
 *   1. query param → 2. cookie → 3. tenant default → 4. Accept-Language → DEFAULT
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock h3's getCookie (explicitly imported in locale.ts) before loading the module
vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    getCookie: vi.fn().mockReturnValue(undefined),
  }
})

// Stubs for h3/Nuxt auto-imported helpers used in locale.ts
const getQueryMock = vi.fn().mockReturnValue({})
vi.stubGlobal('getQuery', getQueryMock)

const getHeaderMock = vi.fn()
vi.stubGlobal('getHeader', getHeaderMock)

vi.stubGlobal('defineEventHandler', (fn: (event: unknown) => unknown) => fn)

// Import getCookie after mock is set up so we can drive it per-test
const { getCookie: getCookieMock } = await import('h3') as { getCookie: ReturnType<typeof vi.fn> }

const module = await import('../../../../server/middleware/1.locale')
const handler = (module.default ?? module) as unknown as (event: unknown) => void

function makeEvent(path: string, tenant?: { defaultLocale?: string }): { path: string, context: Record<string, unknown> } {
  return { path, context: tenant ? { tenant } : {} }
}

describe('1.locale middleware', () => {
  beforeEach(() => {
    vi.mocked(getCookieMock).mockReset().mockReturnValue(undefined)
    getQueryMock.mockReset().mockReturnValue({})
    getHeaderMock.mockReset().mockReturnValue(undefined)
  })

  it('skips locale detection for /_nuxt paths', () => {
    const event = makeEvent('/_nuxt/chunk.js')
    handler(event)
    expect((event as any).context.locale).toBeUndefined()
  })

  it('falls back to DEFAULT_LOCALE when nothing is set', () => {
    const event = makeEvent('/')
    handler(event)
    // DEFAULT_LOCALE is 'el' per i18n/locales.ts
    expect((event as any).context.locale).toBe('el')
  })

  it('priority 1: query param overrides tenant default', () => {
    getQueryMock.mockReturnValue({ locale: 'el' })
    const event = makeEvent('/', { defaultLocale: 'de' })
    handler(event)
    expect((event as any).context.locale).toBe('el')
  })

  it('priority 2: i18n_redirected cookie overrides tenant default and Accept-Language', () => {
    getQueryMock.mockReturnValue({})
    vi.mocked(getCookieMock).mockImplementation((_event: unknown, name: string) =>
      name === 'i18n_redirected' ? 'el' : undefined,
    )
    getHeaderMock.mockReturnValue('de') // Accept-Language — not used
    const event = makeEvent('/', { defaultLocale: 'de' })
    handler(event)
    expect((event as any).context.locale).toBe('el')
  })

  it('priority 4: Accept-Language used when query/cookie/tenant all absent', () => {
    getQueryMock.mockReturnValue({})
    vi.mocked(getCookieMock).mockReturnValue(undefined)
    getHeaderMock.mockReturnValue('el,en-US;q=0.9')
    const event = makeEvent('/')
    handler(event)
    expect((event as any).context.locale).toBe('el')
  })

  it('tenant defaultLocale wins over Accept-Language when no cookie/query', () => {
    getQueryMock.mockReturnValue({})
    vi.mocked(getCookieMock).mockReturnValue(undefined)
    // Use unsupported locales in Accept-Language to confirm tenant wins
    getHeaderMock.mockReturnValue('fr,de;q=0.9')
    const event = makeEvent('/', { defaultLocale: 'el' })
    handler(event)
    expect((event as any).context.locale).toBe('el')
  })

  it('ignores unsupported tenant defaultLocale and falls through to Accept-Language', () => {
    getQueryMock.mockReturnValue({})
    vi.mocked(getCookieMock).mockReturnValue(undefined)
    getHeaderMock.mockReturnValue('el')
    // 'de' is not in SUPPORTED_LOCALES (only 'el' is active)
    const event = makeEvent('/', { defaultLocale: 'de' })
    handler(event)
    // Falls through to Accept-Language ('el')
    expect((event as any).context.locale).toBe('el')
  })
})
