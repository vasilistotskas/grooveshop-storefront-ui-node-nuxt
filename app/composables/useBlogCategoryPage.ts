/**
 * Everything a blog category page needs that is not its drawing: the
 * category (404 when there is none), its posts a page at a time in the
 * URL's ordering, the pagination and ordering controls, and the head
 * (title, description, canonical, Open Graph).
 *
 * Shared by every drawing of the page (`Storefront/BlogCategory.vue` and
 * the tenants' own), so the requests, their keys and the SEO are decided
 * once. The document title's wording stays in each page's own messages:
 * `documentTitle` turns the category's name into it. Call it from a
 * body's `<script setup>`, before the first `await`.
 */
export async function useBlogCategoryPage(options: {
  documentTitle: (name: string) => string
}) {
  const { locale, t } = useI18n({ useScope: 'global' })
  const route = useRoute()
  const img = useMediaStreamImage()
  const { declare, canonicalUrl } = useDocumentLocales()

  const paginationType = PaginationTypeEnum.PAGE_NUMBER
  const categoryId = 'id' in route.params
    ? route.params.id
    : undefined

  const page = computed(() => route.query.page)
  const ordering = computed(() => route.query.ordering || '-createdAt')
  const pageSize = ref(15)
  const entityOrdering = ref<EntityOrdering<any>>([
    {
      value: 'createdAt',
      label: t('ordering.created_at'),
      options: ['ascending', 'descending'],
    },
  ])

  // Started before the category is awaited: the posts need only the route,
  // and after an await a composable has no component instance, so a request
  // started there is never torn down with the page and a later mount reads
  // its stale query.
  const {
    data: posts,
    status: postStatus,
  } = useLazyApi(
    `/api/blog/categories/${categoryId}/posts`,
    {
      key: `blogCategoryPosts${categoryId}`,
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        pageSize: pageSize,
        page: page,
        ordering: ordering,
        paginationType: paginationType,
        languageCode: locale,
      },
    },
  )

  const { data: category, status: categoryStatus, error } = await useApi(
    `/api/blog/categories/${categoryId}`,
    {
      key: `blogCategory${categoryId}`,
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        languageCode: locale,
      },
    },
  )

  if (error.value || !category.value) {
    throw createError({
      statusCode: 404,
      message: t('error.page.not.found'),
    })
  }

  const categoryTitle = computed(() => {
    return extractTranslated(category?.value, 'name', locale.value) || ''
  })

  // `undefined`, never '': an empty value still emits
  // `<meta name="description" content>`, which is strictly worse than no
  // tag at all — Google cannot fall back to generating a snippet, and
  // Ahrefs reports it as "Meta description tag missing or empty".
  // Omitting it lets the site-level description apply instead.
  const categoryDescription = computed(() => {
    return extractTranslated(category?.value, 'description', locale.value)
      || undefined
  })

  const totalPosts = computed(() => category.value?.postCount || 0)

  const pagination = computed(() => {
    if (!posts.value?.count) return
    return usePagination<BlogPost>(posts.value)
  })

  const orderingOptions = computed(() => {
    return useOrdering(entityOrdering.value)
  })

  const ogImage = computed(() => {
    if (!category || !category.value || !category.value.mainImagePath) {
      return ''
    }

    return img(category.value.mainImagePath, {
      ...OG_IMAGE_SIZE,
      format: 'png',
      fit: 'cover',
    }, {
      provider: 'mediaStream',
    })
  })

  // The canonical and the hreflang set are built from the entity's OWN
  // id+slug, never from route.path: the [slug] segment is decorative (the
  // id resolves the record), so /{id}/anything renders the same page and —
  // self-canonicalising — every variant became its own indexable URL.
  // Declaring the document (useDocumentLocales) hands that to
  // setupPageHeader, which names the locale each version really exists in;
  // a page writing its own canonical or hreflang is what pointed every
  // /en/** page at the Greek URL.
  declare(
    translatedLocales(category.value?.translations, 'name'),
    `/blog/category/${category.value?.id}/${category.value?.slug}`,
  )

  // A bare category name ("PC", "AI") is a 2-3 character title that tells
  // a searcher nothing about the page. The name still drives the H1 and
  // breadcrumb; only the document title gets the qualifier.
  const categoryDocumentTitle = computed(() =>
    categoryTitle.value ? options.documentTitle(categoryTitle.value) : '',
  )

  useSeoMeta({
    title: () => categoryDocumentTitle.value,
    ogUrl: () => canonicalUrl.value,
    description: () => categoryDescription.value,
    ogDescription: () => categoryDescription.value,
    ogImage: ogImage.value,
    ogImageWidth: () => ogImage.value ? OG_IMAGE_SIZE.width : undefined,
    ogImageHeight: () => ogImage.value ? OG_IMAGE_SIZE.height : undefined,
    twitterImage: ogImage.value,
  })

  useHead({
    title: categoryDocumentTitle,
  })

  return {
    categoryStatus,
    posts,
    postStatus,
    categoryTitle,
    totalPosts,
    pagination,
    ordering,
    orderingOptions,
    paginationType,
  }
}
