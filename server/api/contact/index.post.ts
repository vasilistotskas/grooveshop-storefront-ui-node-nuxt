export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(event, zCreateContactData.shape.body.parse)
    const response = await $fetch(`${config.apiBaseUrl}/contact`, {
      method: 'POST',
      body,
    })
    return await parseDataAs(response, zCreateContactResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
