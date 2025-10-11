export default defineEventHandler(async (event) => {
  if (!event.node.req.url?.startsWith('/api/')) {
    return
  }

  const config = useRuntimeConfig(event)

  const session = await useSession(event, {
    name: 'nuxt-cart-session',
    password: config.sessionPassword || 'your-secure-password-here',
    cookie: {
      httpOnly: true,
      secure: !import.meta.dev,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    },
  })

  event.context.session = session
})
