export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const oauthParams = session.secure?.oauthParams

  if (!oauthParams) {
    throw createError({ statusCode: 404, statusMessage: 'No OAuth params found' })
  }

  // Use replaceUserSession to atomically read and clear (defu in setUserSession won't clear undefined)
  const { oauthParams: _oauthParams, ...restSecure } = session.secure ?? {}
  await replaceUserSession(event, {
    ...session,
    secure: restSecure,
  })

  return oauthParams
})
