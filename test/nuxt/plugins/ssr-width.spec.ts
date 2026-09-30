import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ssrWidthPlugin from '~/plugins/ssr-width'

/**
 * Which viewport width a render assumes decides its markup, and the
 * SWR cache keys that markup on the `x-device-class` header the
 * device-class middleware stamps. So the plugin has to read the SAME
 * class the key was built from:
 *
 * - the header wins over the user-agent — a cached render gets a cloned
 *   event carrying only the varied headers, and read the UA as empty,
 *   which served desktop HTML to phones for a whole cache lifetime
 *   (found live 2026-08-28);
 * - a header value that is not a device class is ignored rather than
 *   trusted, falling back to classifying the UA;
 * - on the client the number comes back from the payload, never
 *   re-derived, so hydration assumes the width the server rendered at.
 *
 * `provideSSRWidth` is spied on because what it receives IS the plugin's
 * output: the width every `useMediaQuery` answers its first read with.
 */
const { requestHeaders, provideSSRWidth } = vi.hoisted(() => ({
  requestHeaders: vi.fn((): Record<string, string | undefined> => ({})),
  provideSSRWidth: vi.fn(),
}))

mockNuxtImport('useRequestHeaders', () => requestHeaders)

vi.mock('@vueuse/core', async importOriginal => ({
  ...await importOriginal<typeof import('@vueuse/core')>(),
  provideSSRWidth,
}))

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

async function runPlugin() {
  const nuxtApp = useNuxtApp()
  await nuxtApp.runWithContext(() => (ssrWidthPlugin as unknown as (app: typeof nuxtApp) => unknown)(nuxtApp))
  return nuxtApp
}

beforeEach(() => {
  // The plugin already ran once while the app booted; start each case
  // with no width in the payload, as a fresh server render does.
  // `reset: false`: a reset re-runs the boot-time init, which would
  // classify against this file's default headers before the test sets
  // its own.
  clearNuxtState('ssr-width', { reset: false })
})

describe('the ssr-width plugin', () => {
  it.each([
    ['a valid device-class header, over a disagreeing UA', { 'x-device-class': 'tablet', 'user-agent': IPHONE }, 810],
    ['the UA when the header is not a device class', { 'x-device-class': 'watch', 'user-agent': IPHONE }, 375],
    ['the UA when there is no header', { 'user-agent': IPHONE }, 375],
    ['desktop when nothing identifies the device', {}, 1280],
  ])('renders at the width for %s', async (_case, headers, width) => {
    requestHeaders.mockReturnValue(headers)

    const nuxtApp = await runPlugin()

    expect(requestHeaders).toHaveBeenCalledWith(['x-device-class', 'user-agent'])
    expect(useState('ssr-width').value).toBe(width)
    expect(provideSSRWidth).toHaveBeenCalledWith(width, nuxtApp.vueApp)
  })

  it('reuses the width already in the payload instead of classifying again', async () => {
    // The client half: the server's number arrives in the payload, and
    // a second derivation would be free to disagree with the HTML.
    useState('ssr-width', () => 810)
    requestHeaders.mockReturnValue({ 'user-agent': IPHONE })

    const nuxtApp = await runPlugin()

    expect(requestHeaders).not.toHaveBeenCalled()
    expect(provideSSRWidth).toHaveBeenCalledWith(810, nuxtApp.vueApp)
  })
})
