export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListBlogPostData.shape.query.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/blog/post`, query)

    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zListBlogPostResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
