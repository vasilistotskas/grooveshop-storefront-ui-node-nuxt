export const AcceptClientHintsHeaders = {
  prefersColorScheme: 'Sec-CH-Prefers-Color-Scheme',
  prefersReducedMotion: 'Sec-CH-Prefers-Reduced-Motion',
  viewportHeight: 'Sec-CH-Viewport-Height',
  viewportWidth: 'Sec-CH-Viewport-Width',
}

export type AcceptClientHintsHeadersKey = keyof typeof AcceptClientHintsHeaders

export interface SSRClientHintsConfiguration {
  reloadOnFirstRequest: boolean
  viewportSize: boolean
  prefersColorScheme: boolean
  prefersReducedMotion: boolean
  clientWidth?: number
  clientHeight?: number
  prefersColorSchemeOptions?: {
    baseUrl: string
    defaultTheme: string
    themeNames: string[]
    cookieName: string
    darkThemeName: string
    lightThemeName: string
    useBrowserThemeOnly: boolean
  }
}

export interface SSRClientHints {
  firstRequest: boolean
  prefersColorSchemeAvailable: boolean
  prefersReducedMotionAvailable: boolean
  viewportHeightAvailable: boolean
  viewportWidthAvailable: boolean
  prefersColorScheme?: 'dark' | 'light' | 'no-preference'
  prefersReducedMotion?: 'no-preference' | 'reduce'
  viewportHeight?: number
  viewportWidth?: number
  colorSchemeFromCookie?: string
  colorSchemeCookie?: string
}

export const HTTPClientHints = 'nuxt:ssr-client-hints'

export const ssrClientHintsConfiguration: SSRClientHintsConfiguration = {
  reloadOnFirstRequest: true,
  viewportSize: true,
  prefersColorScheme: true,
  prefersReducedMotion: true,
  prefersColorSchemeOptions: {
    baseUrl: '/',
    defaultTheme: 'dark',
    themeNames: ['dark', 'light'],
    cookieName: 'theme',
    darkThemeName: 'dark',
    lightThemeName: 'light',
    useBrowserThemeOnly: false,
  },
}

export const AcceptClientHintsRequestHeaders = Object.entries(
  AcceptClientHintsHeaders,
).reduce(
  (acc, [key, value]) => {
    acc[key as AcceptClientHintsHeadersKey] =
      value.toLowerCase() as Lowercase<string>
    return acc
  },
  {} as Record<AcceptClientHintsHeadersKey, Lowercase<string>>,
)

export const HttpRequestHeaders = Array.from(
  Object.values(AcceptClientHintsRequestHeaders),
).concat('user-agent', 'cookie')
