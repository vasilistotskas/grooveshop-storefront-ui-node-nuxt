import { withQuery } from 'ufo'

export default defineOAuthFacebookEventHandler(
  {
    config: {
      clientId: process.env.NUXT_OAUTH_FACEBOOK_CLIENT_ID,
      clientSecret: process.env.NUXT_OAUTH_FACEBOOK_CLIENT_SECRET,
      scope: ['email', 'public_profile'],
      authorizationURL: 'https://www.facebook.com/v20.0/dialog/oauth',
      tokenURL: 'https://graph.facebook.com/v20.0/oauth/access_token',
    },
    async onSuccess(event, { tokens }) {
      const { access_token, id_token } = tokens
      const client_id = process.env.NUXT_OAUTH_FACEBOOK_CLIENT_ID

      // Store tokens in server-side session (never in URL)
      await setUserSession(event, {
        secure: {
          oauthParams: {
            provider: 'facebook',
            access_token: access_token ?? undefined,
            id_token: id_token ?? undefined,
            client_id: client_id ?? undefined,
            process: 'login',
          },
        },
      })

      const redirectUrl = withQuery('/account/provider/callback', {
        provider: 'facebook',
        process: 'login',
      })
      return sendRedirect(event, redirectUrl)
    },
    async onError(event, error) {
      const redirectUrl = withQuery('/account/provider/callback', {
        provider: 'facebook',
        error: error.name,
      })
      return sendRedirect(event, redirectUrl)
    },
  })
