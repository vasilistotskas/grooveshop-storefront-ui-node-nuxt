export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodBlogCategoryQuery.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/blog/category`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodBlogCategory))
  }
  catch (error) {
    await handleError(error)
  }
})
