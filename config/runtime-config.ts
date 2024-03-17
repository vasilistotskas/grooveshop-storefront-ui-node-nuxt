export const runtimeConfig = {
  buildDate: new Date().toISOString(),

  // Auth
  auth: {
    cookieDomain:
      process.env.NUXT_PUBLIC_AUTH_COOKIE_DOMAIN || '.grooveshop.site',
    oauth: {
      google: {
        clientId: process.env.NUXT_AUTH_OAUTH_GOOGLE_CLIENT_ID,
        clientSecret: process.env.NUXT_AUTH_OAUTH_GOOGLE_CLIENT_SECRET,
        scopes: process.env.NUXT_AUTH_OAUTH_GOOGLE_SCOPES || 'email profile',
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
      },
    },

    email: {
      from: process.env.NUXT_AUTH_EMAIL_FROM || 'vassilistotskas@msn.com',
      provider: {
        name: 'sendgrid',
        apiKey: process.env.NUXT_AUTH_EMAIL_PROVIDER_API_KEY,
        url: 'https://api.sendgrid.com/v3/mail/send',
        authorization: `Bearer ${process.env.NUXT_AUTH_EMAIL_PROVIDER_API_KEY}`,
      },
    },
  },

  // Keys within public are also exposed client-side
  public: {
    environment: process.env.NUXT_PUBLIC_ENVIRONMENT || 'development',
    trailingSlash: String(process.env.NUXT_PUBLIC_TRAILING_SLASH) === 'true',
    titleSeparator: process.env.NUXT_PUBLIC_TITLE_SEPARATOR || '|',
    siteName: process.env.NUXT_PUBLIC_SITE_NAME || 'GrooveShop',
    siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://grooveshop.site',
    siteDescription:
      process.env.NUXT_PUBLIC_SITE_DESCRIPTION || 'GrooveShop Description',
    language: process.env.NUXT_PUBLIC_LANGUAGE || 'en',
    defaultLocale: process.env.NUXT_PUBLIC_LANGUAGE || 'en',
    appTitle: process.env.NUXT_PUBLIC_APP_TITLE || 'GrooveShop - env',
    appDescription:
      process.env.NUXT_PUBLIC_APP_DESCRIPTION || 'GrooveShop Description',
    appImage:
      process.env.NUXT_PUBLIC_APP_IMAGE ||
      'https://grooveshop.site/img/websiteLogo.png',
    domainName: process.env.NUXT_PUBLIC_DOMAIN_NAME || 'grooveshop.site',
    canonicalUrl:
      process.env.NUXT_PUBLIC_CANONICAL_URL || 'https://grooveshop.site',
    baseUrl: process.env.NUXT_PUBLIC_BASE_URL || 'https://grooveshop.site',
    djangoUrl:
      process.env.NUXT_PUBLIC_DJANGO_URL || 'http://backend-service:80',
    apiBaseUrl:
      process.env.NUXT_PUBLIC_API_BASE_URL ||
      'http://backend-service:80/api/v1',
    djangoHost: process.env.NUXT_PUBLIC_DJANGO_HOST || 'backend-service:80',
    facebookAppId: process.env.NUXT_PUBLIC_FACEBOOK_APP_ID || 'facebook-app-id',
    mediaStreamDomain:
      process.env.NUXT_PUBLIC_MEDIA_STREAM_DOMAIN || 'assets.grooveshop.site',
    mediaStreamOrigin:
      process.env.NUXT_PUBLIC_MEDIA_STREAM_ORIGIN ||
      'https://assets.grooveshop.site',
    mediaStreamPath:
      process.env.NUXT_PUBLIC_MEDIA_STREAM_PATH ||
      'https://assets.grooveshop.site/media_stream-image',
    author: {
      name: process.env.NUXT_PUBLIC_AUTHOR_NAME || 'vasilistotskas',
      github_url:
        process.env.NUXT_PUBLIC_AUTHOR_GITHUB_URL ||
        'https://github.com/vasilistotskas',
    },

    // Socials
    socials: {
      facebook:
        process.env.NUXT_PUBLIC_SOCIALS_FACEBOOK || 'https://www.facebook.com',
      twitter: process.env.NUXT_PUBLIC_SOCIALS_TWITTER || 'https://twitter.com',
      instagram:
        process.env.NUXT_PUBLIC_SOCIALS_INSTAGRAM ||
        'https://www.instagram.com',
      discord: process.env.NUXT_PUBLIC_SOCIALS_DISCORD || 'https://discord.gg',
    },

    device: {
      refreshOnResize: true,
    },
  },

  redis: {
    enabled: true,
    host: 'localhost',
    port: 6379,
    username: '',
    password: '',
  },
}
