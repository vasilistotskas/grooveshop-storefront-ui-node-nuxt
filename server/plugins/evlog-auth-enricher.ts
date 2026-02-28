export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('evlog:enrich', async (ctx) => {
    try {
      const session = await getUserSession(ctx.event)
      if (session?.user) {
        ctx.set({ user: { id: session.user.id } })
      }
    }
    catch { /* unauthenticated — skip */ }
  })
})
