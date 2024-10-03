import { withQuery } from 'ufo'

export default defineOAuthGoogleEventHandler(
  {
    config: {
      clientId: process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID,
      clientSecret: process.env.NUXT_OAUTH_GOOGLE_CLIENT_SECRET,
      scope: ['email', 'openid', 'profile'],
    },
    async onSuccess(event, { tokens }) {
      const { access_token, id_token } = tokens
      const client_id = process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID

      const redirectUrl = withQuery('/account/provider/callback', {
        provider: 'google',
        access_token,
        id_token,
        client_id,
        process: 'login',
      })

      return await sendRedirect(event, redirectUrl)
    },
    async onError(event, error) {
      const redirectUrl = withQuery('/account/provider/callback', {
        provider: 'google',
        error: error.name,
      })
      return await sendRedirect(event, redirectUrl)
    },
  })
