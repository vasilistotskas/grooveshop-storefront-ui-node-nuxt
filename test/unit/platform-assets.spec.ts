import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Platform assets referenced from OUTSIDE this repo.
 *
 * `public/img/logo.png` is the platform's Open Graph card (1200x630).
 * Nothing in this repository names it: production points at it through
 * `NUXT_PUBLIC_APP_LOGO` in the infrastructure repo's frontend-config,
 * which `useTenantBranding` reads as `config.public.appLogo` for the
 * platform tenant's `og:image`.
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
    why: 'og:image / schema.org logo via NUXT_PUBLIC_APP_LOGO',
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
