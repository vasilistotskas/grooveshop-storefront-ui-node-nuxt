/**
 * Everything a blog post page needs that is not its drawing: the post,
 * its category and author, the 404/503 a missing or failing post
 * becomes, the title, subtitle and sanitised-for-media body, the head
 * (title, description, canonical, Open Graph, schema.org), the view
 * count and the related posts.
 *
 * Shared by every drawing of the post (`Storefront/BlogPost.vue` and the
 * tenants' own), so the request, its keys and the SEO are decided once.
 * Call it from a body's `<script setup>`, before the first `await`.
 */
export async function useBlogPostPage() {
  const { t, locale } = useI18n()
  const route = useRoute(`blog-post-id-slug___${locale.value}`)
  const siteConfig = useSiteConfig()
  const img = useMediaStreamImage()
  // Before the first await, like every composable here: it reads a Pinia
  // store, and after an await the server has lost the injection context
  // Pinia needs. Called below it, the post page answered 500 ("reading
  // '_s'") whenever another request had changed the active Pinia.
  const { transformImages } = useHtmlContent()
  const siteUrl = siteConfig.url

  const blogPostId = computed(() => Number(route.params.id) || null)

  if (!blogPostId.value) {
    throw createError({
      statusCode: 404,
      message: t('error.page.not.found'),
    })
  }

  // Registered before the first await: a lifecycle hook set after one has
  // no component instance to belong to.
  // Track view count using composable (client-side only, fire-and-forget)
  const { trackView } = useViewCount()
  onMounted(() => {
    trackView('blog', blogPostId.value!)
  })

  const { data: blogPost, refresh, error: blogPostError } = await useApi(
    `/api/blog/posts/${blogPostId.value}`,
    {
      key: `blogPost${blogPostId.value}`,
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        languageCode: locale,
      },
    },
  )

  if (blogPostError.value || !blogPost.value) {
    // Normalize upstream 5xx to 503 (see products/[id]/[slug].vue):
    // temporary for crawlers + retryable by error.vue's one-shot reload.
    const upstreamStatus = blogPostError.value?.statusCode ?? 404
    throw createError(
      upstreamStatus >= 500
        ? { statusCode: 503, message: t('error.service.unavailable') }
        : {
            statusCode: upstreamStatus,
            message: blogPostError.value?.message || t('error.page.not.found'),
          },
    )
  }

  // Critical data: category and author (needed for initial render)
  const [
    { data: blogPostCategory },
    { data: blogPostAuthor },
  ] = await Promise.all([
    useApi(`/api/blog/categories/${blogPost.value.category.id}`, {
      key: `blogCategory-${blogPost.value.category.id}`,
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        languageCode: locale,
      },
      pick: ['id', 'translations'],
    }),
    useApi(`/api/blog/authors/${blogPost.value.author.id}`, {
      key: `blogAuthor${blogPost.value.author.id}`,
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        languageCode: locale,
      },
    }),
  ])

  // Below-the-fold content: use useLazyFetch to not block navigation
  const { data: relatedPosts, status: relatedPostsStatus } = useLazyApi(`/api/blog/posts/${blogPostId.value}/related-posts`, {
    key: `relatedPosts${blogPostId.value}`,
    method: 'GET',
  })

  const blogPostBody = computed(() => {
    const rawBody = extractTranslated(blogPost.value, 'body', locale.value) ?? ''
    return transformImages(rawBody, { maxWidth: ARTICLE_COLUMN_MAX_WIDTH })
  })

  const blogPostTitle = computed(() =>
    extractTranslated(blogPost.value, 'title', locale.value) ?? '',
  )

  const blogPostSubtitle = computed(() =>
    extractTranslated(blogPost.value, 'subtitle', locale.value) ?? '',
  )

  const blogPostSeoKeywords = computed(() =>
    extractTranslated(blogPost.value, 'seoKeywords', locale.value) ?? '',
  )

  const blogPostSeoTitle = computed(() =>
    extractTranslated(blogPost.value, 'seoTitle', locale.value)
    || blogPostTitle.value
    || '',
  )

  // Google appends the site name to a SHORT title and leaves a long one
  // alone — which is exactly why only the three shortest posts were
  // reported as "Page and SERP titles do not match". Mirroring that rule
  // makes the page title agree with the SERP in both directions.
  //
  // A blanket suffix would trade one mismatch for another: 34 of 79 posts
  // would land past the ~60 character display budget (15 already are),
  // where the brand is truncated away again and the extra characters buy
  // nothing. Only append it when it actually fits.
  const TITLE_DISPLAY_BUDGET = 60

  const blogPostDocumentTitle = computed(() => {
    const title = blogPostSeoTitle.value
    const suffix = ` | ${siteConfig.name}`
    return title.length + suffix.length <= TITLE_DISPLAY_BUDGET
      ? `${title}${suffix}`
      : title
  })

  // The operator's own `seo_description` wins untouched. Failing that the
  // subtitle leads — but it is editorial copy written as a strapline, and
  // 63 of the 79 live posts have one under 110 characters, the length
  // every site-audit tool reports as "meta description too short". So a
  // short subtitle is EXTENDED with the article's opening text instead of
  // standing alone: the hand-written words stay, and the snippet fills the
  // space Google is willing to give it.
  //
  // Derived from the BODY, not `contentPreview`: the preview is the first
  // 200 characters of raw HTML, so markup and character references eat an
  // unpredictable share of it and what survives stripping can be almost
  // nothing. `undefined` (not '') as the last resort so the tag is omitted
  // rather than emitted empty — Google cannot fall back to generating a
  // snippet when the attribute is present but blank.
  const blogPostDescription = computed(() => {
    const post = blogPost.value
    const seoDescription = extractTranslated(post, 'seoDescription', locale.value)
    if (seoDescription) return seoDescription

    const bodyText = htmlToPlainText(
      extractTranslated(post, 'body', locale.value) ?? '',
    )
    return composeMetaDescription([blogPostSubtitle.value, bodyText])
  })

  const blogPostCategoryName = computed(() =>
    extractTranslated(blogPostCategory.value, 'name', locale.value) || '',
  )

  const blogAuthorFullName = computed(() => {
    const author = blogPostAuthor.value
    if (!author?.user) return ''
    return `${author.user.firstName || ''} ${author.user.lastName || ''}`.trim()
  })

  const ogImage = computed(() => {
    const post = blogPost.value
    if (!post?.mainImagePath) return ''

    return img(post.mainImagePath, {
      ...OG_IMAGE_SIZE,
      fit: 'cover',
      format: 'png',
    }, {
      provider: 'mediaStream',
    })
  })

  // Canonical is built from the entity's OWN id+slug, never from
  // route.path: the [slug] segment is decorative (the id resolves the
  // record), so /{id}/anything renders the same page and — self-
  // canonicalising — every variant became its own indexable URL, an
  // unbounded duplicate-content surface. products/[id]/[slug].vue
  // already does this; these routes were the ones that did not.
  const canonicalUrl = computed(
    () => `${siteUrl}/blog/post/${blogPost.value?.id}/${blogPost.value?.slug}`,
  )

  useSeoMeta({
    // '%s' because the brand suffix is applied conditionally above; the
    // global template would append it unconditionally.
    titleTemplate: '%s',
    title: () => blogPostDocumentTitle.value,
    description: () => blogPostDescription.value,
    ogDescription: () => blogPostDescription.value,
    ogImageWidth: OG_IMAGE_SIZE.width,
    ogImageHeight: OG_IMAGE_SIZE.height,
    ogImage: () => ogImage.value,
    ogType: 'article',
    ogUrl: () => canonicalUrl.value,
    twitterTitle: () => blogPostSeoTitle.value,
    twitterDescription: () => blogPostDescription.value,
    twitterImage: () => ogImage.value,
    twitterCard: 'summary_large_image',
  })

  // Hreflang alternate links. Currently only 'el' is active.
  // When more locales activate, iterate SUPPORTED_LOCALES and emit one
  // <link rel="alternate"> per locale using the localised path.
  useHead({
    link: [
      {
        rel: 'canonical',
        href: () => canonicalUrl.value,
      },
      {
        rel: 'alternate',
        hreflang: 'el',
        href: () => canonicalUrl.value,
      },
      {
        rel: 'alternate',
        hreflang: 'x-default',
        href: () => canonicalUrl.value,
      },
    ],
  })

  useSchemaOrg([
    definePerson({
      '@id': '#author',
      'name': blogAuthorFullName.value || undefined,
      'url': blogPostAuthor.value?.website || undefined,
      'image': blogPostAuthor.value?.user?.mainImagePath || undefined,
    }),
    defineArticle({
      author: { '@id': '#author' },
      keywords: blogPostSeoKeywords.value ? [blogPostSeoKeywords.value] : undefined,
      headline: () => blogPostSeoTitle.value,
      description: () => blogPostDescription.value,
      image: () => ogImage.value || undefined,
      datePublished: () => blogPost.value?.publishedAt || undefined,
      dateModified: () => blogPost.value?.updatedAt || undefined,
      articleSection: blogPostCategoryName.value ? [blogPostCategoryName.value] : undefined,
    }),
  ])

  return {
    blogPostId,
    blogPost,
    refresh,
    blogPostAuthor,
    blogAuthorFullName,
    blogPostCategoryName,
    blogPostTitle,
    blogPostSubtitle,
    blogPostBody,
    relatedPosts,
    relatedPostsStatus,
  }
}
