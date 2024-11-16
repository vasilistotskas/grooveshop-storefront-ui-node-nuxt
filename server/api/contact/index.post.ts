export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(event, ZodContactBody.parse)
    const response = await $fetch(`${config.public.apiBaseUrl}/contact`, {
      method: 'POST',
      body,
    })
    return await parseDataAs(response, ZodContact)
  }
  catch (error) {
    await handleError(error)
  }
})
