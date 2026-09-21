import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { withoutComments } from '../helpers/sourceText'

/**
 * The SSR viewport width has to be provided on the CLIENT too.
 *
 * `useMediaQuery` — which every `useDevice()` branch runs on — reads
 * `matchMedia` the first time it evaluates, and on the client that
 * first evaluation happens DURING hydration. Unless a width has been
 * provided, a viewport that disagrees with the markup the server sent
 * makes Vue patch two different trees into one.
 *
 * This plugin existed as `ssr-width.server.ts` for three weeks and
 * looked finished: the server half was there, documented, and cache
 * headers varied on the device class. Nothing tested the client half.
 * Measured on staging 2026-09-21, all 26 public routes logged
 * "Hydration completed but contains mismatches" at 768px, and `/blog`
 * rendered as captionless photographs — every post card's overlay
 * title had been patched into the desktop card, which has no
 * positioned wrapper, so the titles resolved against the page
 * container and stacked invisibly on top of each other.
 *
 * So: one plugin, no `.server`/`.client` suffix, and the number
 * carried to the client through the payload rather than derived a
 * second time from `navigator.userAgent` — a second derivation is
 * free to drift from the first, and has nothing to say on a
 * prerendered route, where the server never saw a user-agent.
 */
const PLUGINS = join(__dirname, '../../app/plugins')

function ssrWidthPlugins(): string[] {
  return readdirSync(PLUGINS).filter(name => name.startsWith('ssr-width'))
}

describe('the ssr-width plugin', () => {
  it('runs on both sides, not just the server', () => {
    const files = ssrWidthPlugins()

    expect(files, 'no ssr-width plugin at all').toHaveLength(1)
    expect(
      files[0],
      'a `.server`/`.client` suffix leaves one side with no width, '
      + 'which is the hydration mismatch this file exists to prevent',
    ).toBe('ssr-width.ts')
  })

  it('provides the width to the Vue app', () => {
    const source = readFileSync(join(PLUGINS, 'ssr-width.ts'), 'utf8')

    expect(source).toMatch(/provideSSRWidth\(/)
    expect(
      source,
      'provide it on the app, not the current instance — a plugin has none',
    ).toMatch(/provideSSRWidth\([^)]*nuxtApp\.vueApp/)
  })

  it('hands the server\'s own number to the client', () => {
    // Comment-aware: the plugin's own docstring names the thing this
    // rule forbids, and a plain read matched that sentence.
    const source = withoutComments(
      readFileSync(join(PLUGINS, 'ssr-width.ts'), 'utf8'),
    )

    expect(
      source,
      'the width must travel in the payload, so both sides agree by construction',
    ).toMatch(/useState<number>\(\s*'ssr-width'/)
    expect(
      source,
      're-deriving the class on the client is a second implementation of '
      + 'the same decision, and it is wrong on every prerendered route',
    ).not.toMatch(/navigator\.userAgent/)
  })

  it('classifies with the shared classifier the cache key also uses', () => {
    // `server/middleware/1.device-class.ts` stamps the header the SWR
    // route rules vary on. If these two ever disagree about what a UA
    // is, one device class is served another's HTML for a whole cache
    // lifetime — which is how this was found live on 2026-08-28.
    const source = readFileSync(join(PLUGINS, 'ssr-width.ts'), 'utf8')

    expect(source).toMatch(/deviceClassFromUserAgent\(/)
    expect(source).toMatch(/SSR_WIDTH_BY_DEVICE_CLASS/)
    expect(source).toMatch(/x-device-class/)
  })
})
