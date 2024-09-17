import { withQuery } from 'ufo'

export default oauthFacebookEventHandler(
  {
    config: {
      scope: ['email', 'public_profile'],
      authorizationURL: 'https://www.facebook.com/v20.0/dialog/oauth',
      tokenURL: 'https://graph.facebook.com/v20.0/oauth/access_token',
      authorizationParams: {
        access_type: process.dev ? 'offline' : 'online',
      },
    },
    async onSuccess(event, { tokens }) {
      console.log('Facebook OAuth tokens:', tokens)
      const { access_token, id_token } = tokens
      const client_id = process.env.NUXT_OAUTH_FACEBOOK_CLIENT_ID

      const redirectUrl = withQuery('/account/provider/callback', {
        provider: 'facebook',
        access_token,
        id_token,
        client_id,
        process: 'login',
      })

      return await sendRedirect(event, redirectUrl)
    },
    async onError(event, error) {
      console.error('Facebook OAuth error:', error)
      const redirectUrl = withQuery('/account/provider/callback', {
        provider: 'facebook',
        error: error.name,
      })
      return await sendRedirect(event, redirectUrl)
    },
  })
