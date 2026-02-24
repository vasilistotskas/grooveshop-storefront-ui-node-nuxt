export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const oauthParams = session.secure?.oauthParams

  if (!oauthParams) {
    throw createError({ statusCode: 404, statusMessage: 'No OAuth params found' })
  }

  // Clear from session after reading (one-time use)
  await setUserSession(event, {
    secure: {
      oauthParams: undefined,
    },
  })

  return oauthParams
})
