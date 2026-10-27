/**
 * One page of the blog's categories, for the categories index
 * (`Blog/Categories/List.vue` and the tenants' own drawing of it): the page
 * in the URL, a page of the drawing's size, in the page's language.
 *
 * Shared so the request, its key and the refresh on a URL change are
 * decided once. Call it from a `<script setup>`, with the page size the
 * drawing lays out.
 */
export async function useBlogCategoriesPage(options: {
  paginationType: MaybeRefOrGetter<PaginationType>
  pageSize: MaybeRefOrGetter<number>
}) {
  const route = useRoute()
  const { locale } = useNuxtApp().$i18n

  const page = computed(() => route.query.page)
  const pageSize = computed(() => toValue(options.pageSize))
  const paginationType = computed(() => toValue(options.paginationType))

  const request = useApi(
    '/api/blog/categories',
    {
      key: 'blogCategories',
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        page,
        pageSize,
        paginationType,
        languageCode: locale,
      },
    },
  )

  // Registered before the await: a watcher set after one has no component
  // instance, so it would outlive the page and keep refreshing.
  watch(
    () => route.query,
    async () => {
      await request.refresh()
    },
  )

  const { data: categories, status } = await request

  const pagination = computed(() => {
    if (!categories.value?.count) return
    return usePagination<BlogCategory>(categories.value)
  })

  return { categories, status, pagination }
}
