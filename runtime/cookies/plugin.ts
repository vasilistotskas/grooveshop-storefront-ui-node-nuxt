import type { Plugin } from '#app'
import moduleOptions from '#build/cookie-control-options'
import { getAllCookieIdsString, getCookieId } from './methods'
import type { Cookie, State } from './types'

const plugin: Plugin<{ cookies: State }> = defineNuxtPlugin(() => {
	const cookieIsConsentGiven = useCookie(
		moduleOptions.cookieNameIsConsentGiven,
		moduleOptions.cookieOptions
	)
	const cookieCookiesEnabledIds = useCookie(
		moduleOptions.cookieNameCookiesEnabledIds,
		moduleOptions.cookieOptions
	).value?.split('|')

	const isConsentGiven = ref<boolean | undefined>(
		cookieIsConsentGiven === undefined
			? undefined
			: cookieIsConsentGiven.value === getAllCookieIdsString(moduleOptions)
	)
	const cookiesEnabled = ref<Cookie[] | undefined>(
		cookieCookiesEnabledIds === undefined
			? undefined
			: [
					...moduleOptions.cookies.necessary.filter((cookieNecessary: Cookie) =>
						cookieCookiesEnabledIds.includes(getCookieId(cookieNecessary))
					),
					...moduleOptions.cookies.optional.filter((cookieOptional: Cookie) =>
						cookieCookiesEnabledIds.includes(getCookieId(cookieOptional))
					)
				]
	)
	const cookiesEnabledIds = ref<string[] | undefined>(cookieCookiesEnabledIds)
	const isModalActive = ref<boolean>()

	const state = {
		isConsentGiven,
		cookiesEnabled,
		cookiesEnabledIds,
		isModalActive,
		moduleOptions
	} as State

	return {
		provide: {
			cookies: state
		}
	}
})

export default plugin
