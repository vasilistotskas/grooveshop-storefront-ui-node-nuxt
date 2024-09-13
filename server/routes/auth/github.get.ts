import { withQuery } from 'ufo'

export default oauthGitHubEventHandler(
  {
    config: {
      authorizationParams: {
        access_type: process.dev ? 'offline' : 'online',
      },
      scope: ['read:user', 'user:email', 'repo'],
    },
    async onSuccess(event, { tokens }) {
      const { access_token, id_token } = tokens
      const client_id = process.env.NUXT_OAUTH_GITHUB_CLIENT_ID

      const redirectUrl = withQuery('/account/provider/callback', {
        provider: 'github',
        access_token,
        id_token,
        client_id,
        process: 'login',
      })

      return await sendRedirect(event, redirectUrl)
    },
    async onError(event, error) {
      const redirectUrl = withQuery('/account/provider/callback', {
        provider: 'github',
        error: error.name,
      })
      return await sendRedirect(event, redirectUrl)
    },
  })
