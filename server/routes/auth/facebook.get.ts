const facebookHandler = defineOAuthFacebookEventHandler({
  config: {
    clientId: process.env.NUXT_OAUTH_FACEBOOK_CLIENT_ID,
    clientSecret: process.env.NUXT_OAUTH_FACEBOOK_CLIENT_SECRET,
    scope: ['email', 'public_profile'],
    authorizationURL: 'https://www.facebook.com/v20.0/dialog/oauth',
    tokenURL: 'https://graph.facebook.com/v20.0/oauth/access_token',
  },
  async onSuccess(event, { tokens }) {
    const oauthProcess = readAndClearOAuthProcess(event)
    return storeOAuthTokensAndRedirect(
      event,
      'facebook',
      tokens,
      process.env.NUXT_OAUTH_FACEBOOK_CLIENT_ID,
      oauthProcess,
    )
  },
  async onError(event, _error) {
    return redirectOAuthError(event, 'facebook')
  },
})

export default defineEventHandler(async (event) => {
  captureOAuthProcess(event, getQuery(event) as Record<string, string>)
  return facebookHandler(event)
})
