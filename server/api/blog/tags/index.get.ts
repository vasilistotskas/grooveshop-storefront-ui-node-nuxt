import * as z from 'zod'

export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodBlogTagQuery.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/blog/tag`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, z.array(ZodBlogTag))
  }
  catch (error) {
    await handleError(error)
  }
}, { name: 'BlogTagViewSet' })
