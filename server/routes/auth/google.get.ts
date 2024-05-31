import { withQuery } from 'ufo'

export default oauth.googleEventHandler(
  {
    async onSuccess(event, { user, tokens }) {
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
      console.error('Google OAuth error 2:', error)
      console.error('Google OAuth error.data 2:', error.data)
      const redirectUrl = withQuery('/account/provider/callback', {
        provider: 'google',
        error: error.name,
      })
      return await sendRedirect(event, redirectUrl)
    },
  })
