export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(event, ZodProductCreateBody.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product`, {
      method: 'POST',
      body,
    })
    return await parseDataAs(response, ZodProduct)
  }
  catch (error) {
    await handleError(error)
  }
})
