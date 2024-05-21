import type { Directions, LocaleObject } from '@nuxtjs/i18n'
import type { CursorStates } from '~/types'

export function setupPageHeader() {
  const publicConfig = useRuntimeConfig().public
  const { locale, locales } = useI18n()

  const i18nHead = useLocaleHead({
    addDirAttribute: true,
    addSeoAttributes: true,
    identifierAttribute: 'hid',
    route: useRoute(),
    router: useRouter(),
    i18n: useI18n(),
  })

  const localeMap = (locales.value as LocaleObject[]).reduce((acc, l) => {
    acc[l.code!] = l.dir ?? 'ltr'
    return acc
  }, {} as Record<string, Directions>)

  useHead({
    htmlAttrs: {
      lang: () => locale.value,
      dir: () => localeMap[locale.value] ?? 'ltr',
      class: () => [],
    },
  })

  useHydratedHead({
    meta: [
      ...(i18nHead.value.meta || []),
      {
        name: 'description',
        content: publicConfig.appDescription,
      },
      {
        name: 'application-name',
        content: publicConfig.appTitle,
      },
      {
        name: 'author',
        content: publicConfig.author.name,
      },
      {
        name: 'creator',
        content: publicConfig.author.name,
      },
      {
        name: 'publisher',
        content: publicConfig.author.name,
      },
      {
        name: 'mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'msapplication-Config',
        content: '/favicon/browserconfig.xml',
      },
      {
        name: 'msapplication-TileImage',
        content: publicConfig.appLogo,
      },
      {
        name: 'google-site-verification',
        content: publicConfig.googleSiteVerification,
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: publicConfig.appTitle,
      },
      {
        name: 'twitter:description',
        content: publicConfig.appDescription,
      },
      {
        name: 'twitter:image',
        content: publicConfig.appLogo,
      },
      {
        property: 'og:url',
        content: useRoute().fullPath,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:site:name',
        content: publicConfig.appTitle,
      },
      {
        property: 'og:title',
        content: publicConfig.appTitle,
      },
      {
        property: 'og:description',
        content: publicConfig.appDescription,
      },
      {
        property: 'og:locale',
        content: locale.value,
      },
      {
        property: 'og:locale:alternate',
        content: locales.value.map((l: any) => l.iso),
      },
      {
        property: 'fb:app:id',
        content: publicConfig.facebookAppId,
      },
    ],
    titleTemplate: (title?: string) => {
      let titleTemplate = title ?? ''

      if (titleTemplate.match(/&[a-z0-9#]+;/gi)) {
        titleTemplate = unescapeTitleTemplate(titleTemplate, [
          ['"', ['&#34;', '&quot;']],
          ['&', ['&#38;', '&amp;']],
          ['\'', ['&#39;', '&apos;']],
          ['\u003C', ['&#60;', '&lt;']],
          ['\u003E', ['&#62;', '&gt;']],
        ])
        if (titleTemplate.length > 60)
          titleTemplate = `${titleTemplate.slice(0, 60)}...${titleTemplate.endsWith('"') ? '"' : ''}`

        if (!titleTemplate.includes('"'))
          titleTemplate = `"${titleTemplate}"`
      }
      else if (titleTemplate.length > 60) {
        titleTemplate = `${titleTemplate.slice(0, 60)}...${titleTemplate.endsWith('"') ? '"' : ''}`
      }

      if (titleTemplate.length)
        titleTemplate += publicConfig.titleSeparator

      titleTemplate += publicConfig.appTitle

      return titleTemplate
    },
    link: [
      ...(i18nHead.value.link || []),
      {
        key: 'webmanifest',
        rel: 'manifest',
        href: '/manifest.webmanifest',
      },
    ],
  })
}

export function setupCursorStates() {
  return useState<CursorStates>('cursorStates', () => generateInitialCursorStates())
}

export async function setupSession() {
  const { getSession } = useAllAuthAuthentication()
  await callOnce(async () => {
    await getSession()
  })
}

function unescapeTitleTemplate(titleTemplate: string, replacements: [string, string[]][]) {
  let result = titleTemplate
  for (const [replacement, entities] of replacements) {
    for (const e of entities)
      result = result.replaceAll(e, replacement)
  }
  return result.trim()
}
