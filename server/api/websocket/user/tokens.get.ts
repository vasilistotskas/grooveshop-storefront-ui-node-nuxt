export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (!session?.secure) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return {
    sessionToken: session?.secure?.sessionToken,
    accessToken: session?.secure?.accessToken,
  }
})
