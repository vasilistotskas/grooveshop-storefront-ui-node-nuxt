export const runtimeConfig = {
  buildDate: new Date().toISOString(),

  // Auth
  auth: {
    cookieDomain:
    import.meta.env.NUXT_PUBLIC_AUTH_COOKIE_DOMAIN,
    oauth: {
      google: {
        clientId: import.meta.env.NUXT_AUTH_OAUTH_GOOGLE_CLIENT_ID,
        clientSecret: import.meta.env.NUXT_AUTH_OAUTH_GOOGLE_CLIENT_SECRET,
        scopes: import.meta.env.NUXT_AUTH_OAUTH_GOOGLE_SCOPES,
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
      },
    },

    email: {
      from: import.meta.env.NUXT_AUTH_EMAIL_FROM,
      provider: {
        name: 'sendgrid',
        apiKey: import.meta.env.NUXT_AUTH_EMAIL_PROVIDER_API_KEY,
        url: 'https://api.sendgrid.com/v3/mail/send',
        authorization: `Bearer ${import.meta.env.NUXT_AUTH_EMAIL_PROVIDER_API_KEY}`,
      },
    },
  },

  // Keys within public are also exposed client-side
  public: {
    appDescription: import.meta.env.NUXT_PUBLIC_APP_DESCRIPTION,
    appLogo: import.meta.env.NUXT_PUBLIC_APP_LOGO,
    appTitle: import.meta.env.NUXT_PUBLIC_APP_TITLE,
    apiBaseUrl: import.meta.env.NUXT_PUBLIC_API_BASE_URL,
    author: {
      github_url: import.meta.env.NUXT_PUBLIC_AUTHOR_GITHUB_URL,
      name: import.meta.env.NUXT_PUBLIC_AUTHOR_NAME,
    },
    baseUrl: import.meta.env.NUXT_PUBLIC_BASE_URL,
    canonicalUrl: import.meta.env.NUXT_PUBLIC_CANONICAL_URL,
    defaultLocale: import.meta.env.NUXT_PUBLIC_LANGUAGE,
    djangoHost: import.meta.env.NUXT_PUBLIC_DJANGO_HOST,
    djangoUrl: import.meta.env.NUXT_PUBLIC_DJANGO_URL,
    domainName: import.meta.env.NUXT_PUBLIC_DOMAIN_NAME,
    environment: import.meta.env.NUXT_PUBLIC_ENVIRONMENT,
    facebookAppId: import.meta.env.NUXT_PUBLIC_FACEBOOK_APP_ID,
    googleSiteVerification: import.meta.env.NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    language: import.meta.env.NUXT_PUBLIC_LANGUAGE,
    mediaStreamDomain: import.meta.env.NUXT_PUBLIC_MEDIA_STREAM_DOMAIN,
    mediaStreamOrigin: import.meta.env.NUXT_PUBLIC_MEDIA_STREAM_ORIGIN,
    mediaStreamPath: import.meta.env.NUXT_PUBLIC_MEDIA_STREAM_PATH,
    siteDescription: import.meta.env.NUXT_PUBLIC_SITE_DESCRIPTION,
    siteName: import.meta.env.NUXT_PUBLIC_SITE_NAME,
    siteUrl: import.meta.env.NUXT_PUBLIC_SITE_URL,
    socials: {
      discord: import.meta.env.NUXT_PUBLIC_SOCIALS_DISCORD,
      facebook: import.meta.env.NUXT_PUBLIC_SOCIALS_FACEBOOK,
      instagram: import.meta.env.NUXT_PUBLIC_SOCIALS_INSTAGRAM,
      twitter: import.meta.env.NUXT_PUBLIC_SOCIALS_TWITTER,
      tiktok: import.meta.env.NUXT_PUBLIC_SOCIALS_TIKTOK,
      youtube: import.meta.env.NUXT_PUBLIC_SOCIALS_YOUTUBE,
      reddit: import.meta.env.NUXT_PUBLIC_SOCIALS_REDDIT,
      pinterest: import.meta.env.NUXT_PUBLIC_SOCIALS_PINTEREST,
    },
    titleSeparator: import.meta.env.NUXT_PUBLIC_TITLE_SEPARATOR,
    trailingSlash: String(import.meta.env.NUXT_PUBLIC_TRAILING_SLASH) === 'true',
  },

  redis: {
    enabled: true,
    host: 'localhost',
    port: 6379,
    username: '',
    password: '',
  },
}
