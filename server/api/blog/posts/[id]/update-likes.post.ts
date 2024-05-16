import { ZodBlogPost, ZodBlogPostParams } from '~/types/blog/post'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  try {
    const params = await getValidatedRouterParams(event, ZodBlogPostParams.parse)
    const response = await $fetch(
      `${config.public.apiBaseUrl}/blog/post/${params.id}/update_likes`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    return await parseDataAs(response, ZodBlogPost)
  }
  catch (error) {
    await handleError(error)
  }
})
