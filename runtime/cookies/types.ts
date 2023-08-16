import { Ref } from 'vue'
import { z } from 'zod'

export type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>

export const CookieTypeEnum = z.enum(['necessary', 'optional'])

export interface Cookie {
	description?: string
	id?: string
	name: string
	links?: Record<string, string | null>
	src?: string
	targetCookieIds?: string[]
}

export interface ModuleOptions {
	cookieExpiryOffsetMs: number
	cookieNameCookiesEnabledIds: string
	cookieNameIsConsentGiven: string
	cookies: {
		necessary: Cookie[]
		optional: Cookie[]
	}
	domain: string
	isAcceptNecessaryButtonEnabled: boolean
	isControlButtonEnabled: boolean
	isCookieIdVisible: boolean
	isCssEnabled: boolean
	isDashInDescriptionEnabled: boolean
	isIframeBlocked: boolean | { initialState: boolean }
}

export const DEFAULTS: Required<ModuleOptions> = {
	cookies: {
		necessary: [],
		optional: []
	},
	cookieExpiryOffsetMs: 1000 * 60 * 60 * 24 * 365, // one year
	cookieNameIsConsentGiven: 'ncc_c',
	cookieNameCookiesEnabledIds: 'ncc_e',
	isAcceptNecessaryButtonEnabled: true,
	isControlButtonEnabled: true,
	isCookieIdVisible: false,
	isCssEnabled: true,
	isDashInDescriptionEnabled: true,
	isIframeBlocked: false,
	domain: ''
}

export interface State {
	cookiesEnabled: Ref<Cookie[] | undefined>
	cookiesEnabledIds: Ref<string[] | undefined>
	isConsentGiven: Ref<boolean | undefined>
	isModalActive: Ref<boolean>
	moduleOptions: ModuleOptions
}
