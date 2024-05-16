import { ZodBlogCategory, ZodBlogCategoryParams } from '~/types/blog/category'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodBlogCategoryParams.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/blog/category/${params.id}`,
      {
        method: 'GET',
      },
    )
    return await parseDataAs(response, ZodBlogCategory)
  }
  catch (error) {
    await handleError(error)
  }
})
