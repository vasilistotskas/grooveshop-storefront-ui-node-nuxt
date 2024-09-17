import type { Ref } from 'vue'
import { z } from 'zod'

import type { CookieOptions } from '#app'

export const ZodCookieTypeEnum = z.enum(['necessary', 'optional'])
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
  isIframeBlocked: boolean
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
    secure: import.meta.env.NODE_ENV === 'development' ? undefined : true,
  },
  isAcceptNecessaryButtonEnabled: true,
  isControlButtonEnabled: true,
  isCookieIdVisible: true,
  isCssEnabled: true,
  isDashInDescriptionEnabled: true,
  isIframeBlocked: false,
  isModalForced: false,
}

export interface State {
  cookiesEnabled: Ref<Cookie[] | undefined>
  cookiesEnabledIds: Ref<string[] | undefined>
  isConsentGiven: Ref<boolean | undefined>
  isModalActive: Ref<boolean>
  moduleOptions: ModuleOptions
}
