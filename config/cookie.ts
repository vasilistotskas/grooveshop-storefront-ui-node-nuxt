import type { ModuleOptions } from '#cookie-control/types'

export const cookieControl = {
	cookies: {
		necessary: [
			{
				id: 'NEC',
				description: 'components.cookie.cookies.necessary_description',
				name: 'components.cookie.cookies.necessary',
				targetCookieIds: ['NEC']
			}
		],
		optional: [
			{
				id: 'op',
				name: 'components.cookie.cookies.optional',
				links: {
					'https://example.com':
						'components.cookie.cookies.optional_links.privacy_policy',
					'https://example.cop': null
				},
				targetCookieIds: ['_o', '_p', '_t']
			},
			{
				id: 'functional',
				name: 'components.cookie.cookies.functional',
				description: 'components.cookie.cookies.functional_description',
				targetCookieIds: ['functional']
			},
			{
				id: 'ga',
				name: 'components.cookie.cookies.google.analytics',
				description: 'components.cookie.cookies.google.analytics_description',
				src: `https://www.googletagmanager.com/gtag/js?id=${process.env.NUXT_PUBLIC_GOOGLE_TAG_ID}`,
				targetCookieIds: ['_ga', '_gat', '_gid']
			}
		]
	}
} satisfies Partial<ModuleOptions>
