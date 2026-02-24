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

      // Store tokens in server-side session (never in URL)
      await setUserSession(event, {
        secure: {
          oauthParams: {
            provider: 'google',
            access_token: access_token ?? undefined,
            id_token: id_token ?? undefined,
            client_id: client_id ?? undefined,
            process: 'login',
          },
        },
      })

      const redirectUrl = withQuery('/account/provider/callback', {
        provider: 'google',
        process: 'login',
      })
      return sendRedirect(event, redirectUrl)
    },
    async onError(event, error) {
      const redirectUrl = withQuery('/account/provider/callback', {
        provider: 'google',
        error: error.name,
      })
      return sendRedirect(event, redirectUrl)
    },
  })
