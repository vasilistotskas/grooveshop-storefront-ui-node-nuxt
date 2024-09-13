import { withQuery } from 'ufo'

export default oauthFacebookEventHandler(
  {
    config: {
      authorizationParams: {
        access_type: process.dev ? 'offline' : 'online',
      },
    },
    async onSuccess(event, { tokens }) {
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
      const redirectUrl = withQuery('/account/provider/callback', {
        provider: 'facebook',
        error: error.name,
      })
      return await sendRedirect(event, redirectUrl)
    },
  })
