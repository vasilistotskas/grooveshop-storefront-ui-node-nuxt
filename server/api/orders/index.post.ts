export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(event, ZodOrderCreateBody.parse)
    const response = await $fetch(`${config.apiBaseUrl}/order`, {
      method: 'POST',
      body,
    })
    return await parseDataAs(response, ZodOrderCreateResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
