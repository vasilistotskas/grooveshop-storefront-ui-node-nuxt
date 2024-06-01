export const runtimeConfig = {
  buildDate: new Date().toISOString(),

  // Auth
  auth: {
    cookieDomain:
    process.env.NUXT_PUBLIC_AUTH_COOKIE_DOMAIN,
  },

  // Keys within public are also exposed client-side
  public: {
    appDescription: process.env.NUXT_PUBLIC_APP_DESCRIPTION,
    appLogo: process.env.NUXT_PUBLIC_APP_LOGO,
    appTitle: process.env.NUXT_PUBLIC_APP_TITLE,
    apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL,
    author: {
      github_url: process.env.NUXT_PUBLIC_AUTHOR_GITHUB_URL,
      name: process.env.NUXT_PUBLIC_AUTHOR_NAME,
    },
    baseUrl: process.env.NUXT_PUBLIC_BASE_URL,
    canonicalUrl: process.env.NUXT_PUBLIC_CANONICAL_URL,
    defaultLocale: process.env.NUXT_PUBLIC_LANGUAGE,
    djangoHost: process.env.NUXT_PUBLIC_DJANGO_HOST,
    djangoUrl: process.env.NUXT_PUBLIC_DJANGO_URL,
    domainName: process.env.NUXT_PUBLIC_DOMAIN_NAME,
    environment: process.env.NUXT_PUBLIC_ENVIRONMENT,
    facebookAppId: process.env.NUXT_PUBLIC_FACEBOOK_APP_ID,
    googleSiteVerification: process.env.NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    language: process.env.NUXT_PUBLIC_LANGUAGE,
    mediaStreamDomain: process.env.NUXT_PUBLIC_MEDIA_STREAM_DOMAIN,
    mediaStreamOrigin: process.env.NUXT_PUBLIC_MEDIA_STREAM_ORIGIN,
    mediaStreamPath: process.env.NUXT_PUBLIC_MEDIA_STREAM_PATH,
    siteDescription: process.env.NUXT_PUBLIC_SITE_DESCRIPTION,
    siteName: process.env.NUXT_PUBLIC_SITE_NAME,
    siteUrl: process.env.NUXT_PUBLIC_SITE_URL,
    socials: {
      discord: process.env.NUXT_PUBLIC_SOCIALS_DISCORD,
      facebook: process.env.NUXT_PUBLIC_SOCIALS_FACEBOOK,
      instagram: process.env.NUXT_PUBLIC_SOCIALS_INSTAGRAM,
      twitter: process.env.NUXT_PUBLIC_SOCIALS_TWITTER,
      tiktok: process.env.NUXT_PUBLIC_SOCIALS_TIKTOK,
      youtube: process.env.NUXT_PUBLIC_SOCIALS_YOUTUBE,
      reddit: process.env.NUXT_PUBLIC_SOCIALS_REDDIT,
      pinterest: process.env.NUXT_PUBLIC_SOCIALS_PINTEREST,
    },
    titleSeparator: process.env.NUXT_PUBLIC_TITLE_SEPARATOR,
    trailingSlash: String(process.env.NUXT_PUBLIC_TRAILING_SLASH) === 'true',
  },
}
