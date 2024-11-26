import * as z from 'zod'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, ZodBlogPostParams.parse)
    const query = await getValidatedQuery(event, ZodBlogPostQuery.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/blog/post/${params.id}/related_posts`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, z.array(ZodBlogPost))
  }
  catch (error) {
    await handleError(error)
  }
})
