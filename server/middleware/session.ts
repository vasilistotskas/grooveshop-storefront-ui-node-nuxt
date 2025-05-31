export default defineEventHandler(async (event) => {
  if (!event.node.req.url?.startsWith('/api/')) {
    return
  }

  const session = await useSession(event, {
    name: 'nuxt-cart-session',
    password: process.env.NUXT_SESSION_PASSWORD || 'your-secure-password-here',
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    },
  })

  event.context.session = session
})
