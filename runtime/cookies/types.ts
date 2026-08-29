import type { Ref } from 'vue'

import type { CookieOptions } from '#app'

// Plain const map, deliberately NOT a z.enum: this module loads in the
// entry chunk (cookie-consent runtime), and its former zod import was
// one of the edges dragging the zod runtime into every page's critical
// JS graph (2026-08-29 mobile-perf pass). Nothing ever parsed with it —
// consumers only read the values.
export const COOKIE_TYPES = ['necessary', 'optional'] as const
export type CookieType = (typeof COOKIE_TYPES)[number]
export const COOKIE_ID_SEPARATOR = '~'

export interface Cookie {
  description?: string
  id: string
  name: string
  links?: Record<string, string | null>
  src?: string | string[]
  targetCookieIds?: string[]
}

export interface ModuleOptions {
  closeModalOnClickOutside: boolean
  cookieExpiryOffsetMs: number
  cookieNameCookiesEnabledIds: string
  cookieNameIsConsentGiven: string
  cookies: {
    necessary: Cookie[]
    optional: Cookie[]
  }
  cookieOptions: (CookieOptions & { readonly?: false | undefined }) | undefined
  isAcceptNecessaryButtonEnabled: boolean
  isControlButtonEnabled: boolean
  isCookieIdVisible: boolean
  isCssEnabled: boolean
  isDashInDescriptionEnabled: boolean
  isModalForced: boolean
}

export const DEFAULTS: Required<ModuleOptions> = {
  closeModalOnClickOutside: false,
  cookies: {
    necessary: [],
    optional: [],
  },
  cookieExpiryOffsetMs: 1000 * 60 * 60 * 24 * 365, // one year
  cookieNameIsConsentGiven: 'ncc_c',
  cookieNameCookiesEnabledIds: 'ncc_e',
  cookieOptions: {
    path: '/',
    readonly: false,
    sameSite: 'strict',
    secure: Boolean(import.meta.env.PROD),
  },
  isAcceptNecessaryButtonEnabled: true,
  isControlButtonEnabled: true,
  isCookieIdVisible: true,
  isCssEnabled: true,
  isDashInDescriptionEnabled: true,
  isModalForced: false,
}

export interface State {
  cookiesEnabled: Ref<Cookie[] | undefined>
  cookiesEnabledIds: Ref<string[] | undefined>
  isConsentGiven: Ref<boolean | undefined>
  isModalActive: Ref<boolean>
  moduleOptions: ModuleOptions
}
