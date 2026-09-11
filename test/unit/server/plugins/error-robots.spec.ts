/**
 * Unit tests for server/plugins/error-robots.ts
 *
 * @nuxtjs/robots sets `X-Robots-Tag` by path before the render, so an
 * error page for an indexable path carried `index, follow` and no
 * robots meta. Nuxt renders the error page as an internal
 * `/__nuxt_error` request and copies that response's headers onto the
 * outer one, so the plugin marks the INTERNAL render with the module's
 * disabled value (header + meta) on `render:html`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { setResponseHeaderMock, runtimeConfigMock, requestHeaderMock } = vi.hoisted(() => ({
  setResponseHeaderMock: vi.fn(),
  runtimeConfigMock: vi.fn(),
  requestHeaderMock: vi.fn(),
}))

type Event = { path: string }
type Html = { head: string[] }
let hook: (html: Html, ctx: { event: Event }) => void
let isNuxtErrorRender: (event: Event) => boolean

beforeAll(async () => {
  // The plugin module calls the Nitro auto-imports at load time, so the
  // stubs have to exist before it is imported (hence no static import).
  vi.stubGlobal('defineNitroPlugin', (fn: (app: unknown) => void) => fn)
  vi.stubGlobal('setResponseHeader', setResponseHeaderMock)
  vi.stubGlobal('useRuntimeConfig', runtimeConfigMock)
  vi.stubGlobal('getRequestHeader', requestHeaderMock)
  const mod = await import('../../../../server/plugins/error-robots')
  isNuxtErrorRender = mod.isNuxtErrorRender as typeof isNuxtErrorRender
  const plugin = mod.default as unknown as (app: {
    hooks: { hook: (name: string, fn: typeof hook) => void }
  }) => void
  plugin({
    hooks: {
      hook: (name, fn) => {
        if (name === 'render:html') hook = fn
      },
    },
  })
})

afterAll(() => vi.unstubAllGlobals())

beforeEach(() => {
  setResponseHeaderMock.mockReset()
  requestHeaderMock.mockReset()
  requestHeaderMock.mockReturnValue(undefined)
  runtimeConfigMock.mockReset()
  runtimeConfigMock.mockReturnValue({
    'nuxt-robots': { header: true, robotsDisabledValue: 'noindex, nofollow' },
  })
})

const render = (path: string) => {
  const html = { head: [] as string[] }
  const event = { path }
  hook(html, { event })
  return { html, event }
}

describe('error-robots plugin', () => {
  it('registers on render:html', () => {
    expect(hook).toBeTypeOf('function')
  })

  it('marks the internal error render with the module disabled value', () => {
    const { html, event } = render('/__nuxt_error?url=/blog/post/99999/nope')

    expect(setResponseHeaderMock).toHaveBeenCalledWith(event, 'X-Robots-Tag', 'noindex, nofollow')
    expect(html.head).toEqual(['<meta name="robots" content="noindex, nofollow">'])
  })

  it('recognises the error render by its request marker too', () => {
    requestHeaderMock.mockImplementation((_event: Event, name: string) =>
      name === 'x-nuxt-error' ? 'true' : undefined)

    const { html } = render('/blog/post/99999/nope')

    expect(html.head).toHaveLength(1)
  })

  it('uses whatever the module is configured with, never a value of its own', () => {
    runtimeConfigMock.mockReturnValue({
      'nuxt-robots': { header: true, robotsDisabledValue: 'none' },
    })

    const { html } = render('/__nuxt_error')

    expect(setResponseHeaderMock).toHaveBeenCalledWith(expect.anything(), 'X-Robots-Tag', 'none')
    expect(html.head).toEqual(['<meta name="robots" content="none">'])
  })

  it('leaves ordinary page renders untouched', () => {
    const { html } = render('/products')

    expect(setResponseHeaderMock).not.toHaveBeenCalled()
    expect(html.head).toEqual([])
  })

  it('keeps the meta but skips the header when the module has the header off', () => {
    runtimeConfigMock.mockReturnValue({
      'nuxt-robots': { header: false, robotsDisabledValue: 'noindex, nofollow' },
    })

    const { html } = render('/__nuxt_error')

    expect(setResponseHeaderMock).not.toHaveBeenCalled()
    expect(html.head).toHaveLength(1)
  })
})

describe('isNuxtErrorRender', () => {
  it('matches the internal error path', () => {
    expect(isNuxtErrorRender({ path: '/__nuxt_error?url=%2Fx' })).toBe(true)
    expect(isNuxtErrorRender({ path: '/__nuxt_island/x' })).toBe(false)
    expect(isNuxtErrorRender({ path: '/' })).toBe(false)
  })
})
