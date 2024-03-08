import type { ModuleOptions } from '#cookie-control/types'

export const cookieControl = {
  cookies: {
    necessary: [
      {
        id: 'NEC',
        name: 'components.cookie.cookies.necessary',
        description: 'components.cookie.cookies.necessary_description',
        targetCookieIds: ['NEC'],
      },
    ],
    optional: [
      {
        id: 'ANALYTICS',
        name: 'components.cookie.cookies.analytics',
        description: 'components.cookie.cookies.analytics_description',
        src: `https://www.googletagmanager.com/gtag/js?id=${process.env.NUXT_PUBLIC_GOOGLE_TAG_ID}`,
        targetCookieIds: ['_ga', '_gat', '_gid'],
      },
      {
        id: 'ADVERTISING',
        name: 'components.cookie.cookies.advertising',
        description: 'components.cookie.cookies.advertising_description',
        links: {
          [`${process.env.NUXT_PUBLIC_SITE_URL}/privacy`]:
            'components.cookie.cookies.optional_links.privacy_policy',
        },
        targetCookieIds: ['_fbp', 'fr', 'tr'],
      },
      {
        id: 'FUNCTIONAL',
        name: 'components.cookie.cookies.functional',
        description: 'components.cookie.cookies.functional_description',
        targetCookieIds: ['_fbc', 'fbsr_'],
      },
    ],
  },
} satisfies Partial<ModuleOptions>
