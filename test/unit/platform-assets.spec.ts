import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Platform-tenant brand assets referenced only by a URL string.
 *
 * `public/img/logo.png` is the platform tenant's Open Graph card
 * (1200x630). No import names it: `useTenantBranding` builds
 * `${siteConfig.url}/img/logo.png` for the platform tenant's `og:image`
 * (it used to come from a `NUXT_PUBLIC_APP_LOGO` env value in the
 * infrastructure repo, which was just as invisible to a grep).
 *
 * That invisibility is exactly why a dead-code sweep deleted it while
 * the config kept pointing at it — every social preview of a platform
 * link (Facebook, WhatsApp, Slack, Twitter) rendered with a broken
 * image, along with the schema.org organisation logo. Nothing failed;
 * the page still served 200.
 *
 * These assertions give the file a reference a grep CAN find.
 */
const PLATFORM_ASSETS = [
  {
    path: 'public/img/logo.png',
    why: 'og:image / schema.org logo (useTenantBranding ogImageUrl)',
    minBytes: 1000,
  },
  {
    path: 'public/img/logo-navbar.png',
    why: 'platform navbar wordmark (useTenantBranding light logo)',
    minBytes: 500,
  },
  {
    path: 'public/img/logo-border.png',
    why: 'square platform mark on the login/signup forms',
    minBytes: 500,
  },
]

describe('platform assets referenced by external configuration', () => {
  it.each(PLATFORM_ASSETS)('$path exists ($why)', ({ path, minBytes }) => {
    const full = resolve(process.cwd(), path)
    expect(existsSync(full), `${path} is missing — external config still references it`).toBe(true)
    expect(statSync(full).size).toBeGreaterThan(minBytes)
  })

  it('the og card keeps its 1200x630 social dimensions', () => {
    // PNG header: width/height are big-endian uint32 at byte offsets 16 and 20.
    const buf = readFileSync(resolve(process.cwd(), 'public/img/logo.png'))
    expect(buf.readUInt32BE(16)).toBe(1200)
    expect(buf.readUInt32BE(20)).toBe(630)
  })
})
