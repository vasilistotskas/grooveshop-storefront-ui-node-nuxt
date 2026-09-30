import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { APP } from '../../helpers/sourceText'

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
 * rendered as captionless photographs.
 *
 * Which side a plugin runs on is decided by its FILENAME, so that is
 * what this checks. What the plugin decides — header over user-agent,
 * the payload's number reused on the client — is rendered in
 * `test/nuxt/plugins/ssr-width.spec.ts`.
 */
describe('the ssr-width plugin', () => {
  it('runs on both sides, not just the server', () => {
    const files = readdirSync(resolve(APP, 'plugins')).filter(name => name.startsWith('ssr-width'))

    expect(
      files,
      'a `.server`/`.client` suffix leaves one side with no width, '
      + 'which is the hydration mismatch this file exists to prevent',
    ).toEqual(['ssr-width.ts'])
  })
})
