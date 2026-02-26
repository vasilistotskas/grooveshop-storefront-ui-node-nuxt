export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  if (!session.secure?.accessToken) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return {
    accessToken: session.secure.accessToken,
  }
})
