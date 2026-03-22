export default defineEventHandler(async (event) => {
  if (event.path.startsWith('/_nuxt') || event.path.startsWith('/_ipx') || event.path.startsWith('/assets')) return

  try {
    const session = await getUserSession(event)
    if (session?.user) {
      useLogger(event).set({ user: { id: session.user.id } })
    }
  }
  catch { /* unauthenticated — skip */ }
})
