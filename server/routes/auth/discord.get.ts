import { withQuery } from 'ufo'

export default oauthDiscordEventHandler(
  {
    config: {
      authorizationParams: {
        access_type: process.dev ? 'offline' : 'online',
      },
      scope: ['identify', 'openid', 'profile'],
    },
    async onSuccess(event, { tokens }) {
      const { access_token, id_token } = tokens
      const client_id = process.env.NUXT_OAUTH_DISCORD_CLIENT_ID

      const redirectUrl = withQuery('/account/provider/callback', {
        provider: 'discord',
        access_token,
        id_token,
        client_id,
        process: 'login',
      })

      return await sendRedirect(event, redirectUrl)
    },
    async onError(event, error) {
      const redirectUrl = withQuery('/account/provider/callback', {
        provider: 'discord',
        error: error.name,
      })
      return await sendRedirect(event, redirectUrl)
    },
  })
