const googleHandler = defineOAuthGoogleEventHandler({
  config: {
    clientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID,
    clientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET,
    scope: ['email', 'openid', 'profile'],
  },
  async onSuccess(event, { tokens }) {
    const oauthProcess = readAndClearOAuthProcess(event)
    return storeOAuthTokensAndRedirect(
      event,
      'google',
      tokens,
      process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID,
      oauthProcess,
    )
  },
  async onError(event, _error) {
    return redirectOAuthError(event, 'google')
  },
})

export default defineEventHandler(async (event) => {
  captureOAuthProcess(event, getQuery(event) as Record<string, string>)
  return googleHandler(event)
})
