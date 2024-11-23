import * as z from 'zod'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(
      `${config.public.apiBaseUrl}/health`,
      {
        method: 'GET',
      })
    return await parseDataAs(response, z.any())
  }
  catch (error) {
    await handleError(error)
  }
})
