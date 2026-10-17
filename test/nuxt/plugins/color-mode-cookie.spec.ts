import { describe, expect, it } from 'vitest'
import { cookieAttrs, storage } from '#build/color-mode-options.mjs'

/**
 * The options @nuxtjs/color-mode hands to `useCookie` for the appearance
 * cookie. 4.0.1's own default spells the lifetime `max-age`, which
 * `useCookie` ignores, so the visitor's light/dark choice was forgotten
 * when the browser closed.
 */
describe('the appearance cookie', () => {
  it('lasts a year and is sent over https only', () => {
    expect(storage).toBe('cookie')
    expect(cookieAttrs).toEqual({
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
      secure: true,
    })
  })
})
