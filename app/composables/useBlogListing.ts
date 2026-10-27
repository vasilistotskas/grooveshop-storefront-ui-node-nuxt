/**
 * The blog index's data: one page of posts, filtered by the URL
 * (`?category`, `?search`, `?tags`, `?author`, `?page`, `?ordering`),
 * the store's categories with their names, and the links of the filter
 * pills that go with them.
 *
 * Shared by every drawing of the index (`Blog/Posts/List.vue` and the
 * tenants' own), so the request, its key and the filter links are
 * decided once. The filter is the URL, like every other, so a filtered
 * page can be shared and the back button undoes it.
 */
export async function useBlogListing(options: {
  paginationType: MaybeRefOrGetter<PaginationType>
  pageSize: MaybeRefOrGetter<number>
  /** The ordering when the URL names none. */
  defaultOrdering?: string
  /**
   * Whether the drawing shows category names or filter pills. A drawing
   * with neither asks for no categories (default: true).
   */
  categories?: boolean
}) {
  const route = useRoute()
  const localePath = useLocalePath()
  const { locale } = useI18n({ useScope: 'global' })
  const cursorState = useState<CursorState>('cursor-state')

  const paginationType = computed(() => toValue(options.paginationType))
  const pageSize = computed(() => toValue(options.pageSize))

  const page = computed(() => route.query.page)
  const ordering = computed(() => route.query.ordering || options.defaultOrdering || '-createdAt')
  const id = computed(() => route.query.id)
  const author = computed(() => route.query.author)
  const slug = computed(() => route.query.slug)
  const tags = computed(() => route.query.tags)
  const category = computed(() => route.query.category)
  const search = computed(() => route.query.search)
  const cursor = computed(
    () => cursorState.value[PaginationCursorStateEnum.BLOG_POSTS],
  )

  const { data: posts, status } = await useApi(
    '/api/blog/posts',
    {
      key: `blogPosts${paginationType.value}`,
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        page: page,
        ordering: ordering,
        id: id,
        author: author,
        slug: slug,
        tags: tags,
        category: category,
        search: search,
        cursor: cursor,
        pageSize: pageSize,
        paginationType: paginationType,
        languageCode: locale,
      },
    },
  )

  // The posts carry their category as an id; the names, and the filter
  // pills, come from the store's categories.
  const { data: categories } = await useApi('/api/blog/categories', {
    key: 'blogCategoryFilter',
    method: 'GET',
    headers: useRequestHeaders(),
    query: { pageSize: 50, paginationType: 'pageNumber', languageCode: locale },
    enabled: options.categories !== false,
  })

  const categoryNames = computed(() => new Map(
    (categories.value?.results ?? []).map(entry => [entry.id, extractTranslated(entry, 'name', locale.value) ?? '']),
  ))

  const pills = computed(() => (categories.value?.results ?? [])
    .filter(entry => entry.postCount > 0)
    .map(entry => ({
      id: entry.id,
      label: extractTranslated(entry, 'name', locale.value) ?? '',
      to: localePath({
        path: route.path,
        query: { ...route.query, category: String(entry.id), page: undefined },
      }),
      active: String(category.value) === String(entry.id),
    })))

  const allPill = computed(() => ({
    to: localePath({
      path: route.path,
      query: { ...route.query, category: undefined, page: undefined },
    }),
    active: !category.value,
  }))

  // Every filter and the search cleared: the way out of an empty result.
  const unfilteredTo = computed(() => localePath({ path: route.path }))

  const isFiltered = computed(() => Boolean(category.value || search.value || tags.value || author.value))

  const isFirstPage = computed(() => !page.value || String(page.value) === '1')

  const pagination = computed(() => {
    if (posts.value) {
      return usePagination<BlogPost>(posts.value)
    }
    return null
  })

  return {
    posts,
    status,
    pagination,
    categoryNames,
    pills,
    allPill,
    unfilteredTo,
    isFiltered,
    isFirstPage,
  }
}
