import { ZodBlogTag, ZodBlogTagParams } from '~/types/blog/tag'

const { maxAge, base } = getCachedEventHandlerOptions()

export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, ZodBlogTagParams.parse)
    const response = await $fetch(
      `${config.public.apiBaseUrl}/blog/tag/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, ZodBlogTag)
  }
  catch (error) {
    await handleError(error)
  }
}, { maxAge, base, name: 'BlogTagViewSet' })
