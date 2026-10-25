/**
 * Everything a blog author page needs that is not its drawing: the author
 * (404 when there is none), their posts a page at a time in the URL's
 * ordering, the figures, the bio, the avatar, the pagination and ordering
 * controls, and the head (title, description, canonical, Open Graph,
 * schema.org Person).
 *
 * Shared by every drawing of the page (`Storefront/BlogAuthor.vue` and
 * the tenants' own). The document title's wording stays in each page's
 * own messages: `documentTitle` turns the author's name into it. Call it
 * from a body's `<script setup>`, before the first `await`.
 */
export async function useBlogAuthorPage(options: {
  documentTitle: (name: string) => string
}) {
  const { locale, t } = useI18n()
  const route = useRoute()
  const img = useMediaStreamImage()
  const tenantStore = useTenantStore()
  const { blogAuthorUrl } = useUrls()
  const { sanitize } = useHtmlContent()
  const { declare, canonicalUrl } = useDocumentLocales()

  const paginationType = PaginationTypeEnum.PAGE_NUMBER
  const authorId = 'id' in route.params ? route.params.id : undefined

  const page = computed(() => route.query.page)
  // The author-posts endpoint reuses the AUTHOR filterset's ordering
  // allow-list (id / createdAt / updatedAt / user_* / website), so the
  // post-specific keys the blog list offers would 400 here. Only
  // createdAt is exposed, which is the one that makes sense anyway.
  const ordering = computed(() => route.query.ordering || '-createdAt')
  const pageSize = ref(15)
  const entityOrdering = ref<EntityOrdering<any>>([
    {
      value: 'createdAt',
      label: t('ordering.created_at'),
      options: ['ascending', 'descending'],
    },
  ])

  // Started before the author is awaited: the posts need only the route,
  // and after an await a composable has no component instance, so a request
  // started there is never torn down with the page and a later mount reads
  // its stale query.
  const { data: posts, status: postStatus } = useLazyApi(
    `/api/blog/authors/${authorId}/posts`,
    {
      key: `blogAuthorPosts${authorId}`,
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

  const { data: author, error } = await useApi(
    `/api/blog/authors/${authorId}`,
    {
      key: `blogAuthor${authorId}`,
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        languageCode: locale,
      },
    },
  )

  if (error.value || !author.value) {
    throw createError({
      statusCode: 404,
      message: t('error.page.not.found'),
    })
  }

  const authorName = computed(() => {
    const user = author.value?.user
    if (!user) return ''
    return `${user.firstName || ''} ${user.lastName || ''}`.trim()
  })

  // The bio is rich text (a Django `RichTextField`, like a post body):
  // sanitised for the page, reduced to plain text for meta and schema.org.
  const authorBioHtml = computed(() =>
    sanitize(extractTranslated(author.value, 'bio', locale.value)),
  )
  const authorBioText = computed(() => htmlToPlainText(authorBioHtml.value))

  // `undefined`, never '': an empty value still emits
  // `<meta name="description" content>`, which is strictly worse than no
  // tag at all — Google cannot fall back to generating a snippet. Same
  // reasoning as the blog category page.
  const metaDescription = computed(
    () => authorBioText.value || undefined,
  )

  const totalPosts = computed(() => author.value?.numberOfPosts || 0)
  const totalLikes = computed(() => author.value?.totalLikesReceived || 0)

  const avatarSrc = computed(() => {
    const path = author.value?.user?.mainImagePath
    if (!path) return undefined
    return img(path, { width: 192, height: 192, fit: 'cover' }, {
      provider: 'mediaStream',
    })
  })

  const pagination = computed(() => {
    if (!posts.value?.count) return
    return usePagination<BlogPost>(posts.value)
  })

  const orderingOptions = computed(() => useOrdering(entityOrdering.value))

  const ogImage = computed(() => {
    const path = author.value?.user?.mainImagePath
    if (!path) return ''
    return img(path, {
      ...OG_IMAGE_SIZE,
      format: 'png',
      fit: 'cover',
    }, {
      provider: 'mediaStream',
    })
  })

  // No decorative [slug] segment here, unlike the category and product
  // routes. BlogAuthor genuinely has no slug — not on the model, not in
  // the payload — and deriving one from a Greek display name would put
  // the canonical URL at the mercy of a client-side transliteration that
  // can drift between renders. The id resolves the record; that is the
  // whole URL.
  // The author page reads the same in every language the store serves (the
  // name is not translated), so it declares them all and the tenant's own
  // locales decide which are advertised.
  declare(tenantStore.availableLocales, blogAuthorUrl(author.value.id))

  const documentTitle = computed(() =>
    authorName.value ? options.documentTitle(authorName.value) : '',
  )

  useSeoMeta({
    title: () => documentTitle.value,
    ogUrl: () => canonicalUrl.value,
    description: () => metaDescription.value,
    ogDescription: () => metaDescription.value,
    ogImage: ogImage.value,
    ogImageWidth: () => ogImage.value ? OG_IMAGE_SIZE.width : undefined,
    ogImageHeight: () => ogImage.value ? OG_IMAGE_SIZE.height : undefined,
    twitterImage: ogImage.value,
  })

  // A Person entity for the page, so a search engine can attribute this
  // author's articles. The @id is absolute and page-scoped rather than
  // the post page's bare `#author`, so the entity belongs to THIS url
  // instead of floating and merging with a same-named author elsewhere.
  useSchemaOrg([
    definePerson({
      '@id': `${canonicalUrl.value}#author`,
      'name': authorName.value || undefined,
      'description': authorBioText.value || undefined,
      'image': ogImage.value || undefined,
      'url': canonicalUrl.value,
    }),
  ])

  useHead({
    title: documentTitle,
  })

  return {
    author,
    posts,
    postStatus,
    authorName,
    authorBioHtml,
    authorBioText,
    totalPosts,
    totalLikes,
    avatarSrc,
    pagination,
    ordering,
    orderingOptions,
    paginationType,
  }
}
