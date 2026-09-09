<script lang="ts" setup>
const { locale, t } = useI18n()
const route = useRoute()
const { isMobileOrTablet } = useDevice()
const img = useMediaStreamImage()
const localePath = useLocalePath()

const paginationType = PaginationTypeEnum.PAGE_NUMBER
const authorId = 'id' in route.params ? route.params.id : undefined

const page = computed(() => route.query.page)
// The author-posts endpoint reuses the AUTHOR filterset's ordering
// allow-list (id / createdAt / updatedAt / user_* / website), so the
// post-specific keys the blog list offers would 400 here. Only
// createdAt is exposed, which is the one that makes sense anyway.
const ordering = computed(() => route.query.ordering || '-createdAt')
const BlogPostCard = computed(() =>
  isMobileOrTablet.value
    ? resolveComponent('BlogPostCardMobile')
    : resolveComponent('BlogPostCardDesktop'),
)

const pageSize = ref(15)
const entityOrdering = ref<EntityOrdering<any>>([
  {
    value: 'createdAt',
    label: t('ordering.created_at'),
    options: ['ascending', 'descending'],
  },
])

const { data: author, error } = await useFetch(
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

const { data: posts, status: postStatus } = useLazyFetch(
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

const authorName = computed(() => {
  const user = author.value?.user
  if (!user) return ''
  return `${user.firstName || ''} ${user.lastName || ''}`.trim()
})

const authorInitials = computed(() => {
  const user = author.value?.user
  if (!user) return ''
  return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
})

const authorBio = computed(
  () => extractTranslated(author.value, 'bio', locale.value) || '',
)

// `undefined`, never '': an empty value still emits
// `<meta name="description" content>`, which is strictly worse than no
// tag at all — Google cannot fall back to generating a snippet. Same
// reasoning as the blog category page.
const metaDescription = computed(
  () => authorBio.value || undefined,
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
    width: 1200,
    height: 630,
    format: 'png',
    fit: 'cover',
  }, {
    provider: 'mediaStream',
  })
})

const items = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('blog'),
    label: t('breadcrumb.items.blog.label'),
  },
  {
    to: localePath({ path: route.fullPath }),
    label: authorName.value || '',
    current: true,
  },
])

const siteConfig = useSiteConfig()
const siteUrl = siteConfig.url

// No decorative [slug] segment here, unlike the category and product
// routes. BlogAuthor genuinely has no slug — not on the model, not in
// the payload — and deriving one from a Greek display name would put
// the canonical URL at the mercy of a client-side transliteration that
// can drift between renders. The id resolves the record; that is the
// whole URL.
const canonicalUrl = computed(
  () => `${siteUrl}/blog/author/${author.value?.id}`,
)

const documentTitle = computed(() =>
  authorName.value ? t('page.title', { name: authorName.value }) : '',
)

useSeoMeta({
  title: () => documentTitle.value,
  ogUrl: () => canonicalUrl.value,
  description: () => metaDescription.value,
  ogDescription: () => metaDescription.value,
  ogImage: ogImage.value,
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
    'description': authorBio.value || undefined,
    'image': ogImage.value || undefined,
    'url': canonicalUrl.value,
  }),
])

useHead({
  title: documentTitle,
  link: [
    { rel: 'canonical', href: () => canonicalUrl.value },
    { rel: 'alternate', hreflang: 'el', href: () => canonicalUrl.value },
    { rel: 'alternate', hreflang: 'x-default', href: () => canonicalUrl.value },
  ],
})

definePageMeta({
  layout: 'default',
  middleware: ['blog-enabled'],
})
</script>

<template>
  <!-- Same frame as /blog and the category page: this is the same post
       list, and a different cap would shift the crumb sideways from the
       page users just came from. -->
  <PageWrapper class="flex flex-col">
    <UBreadcrumb
      :items="items"
      :ui="{
        item: `
          text-primary-950
          dark:text-primary-50
        `,
        root: `
          text-xs
          md:text-base
        `,
      }"
      class="relative mb-5 min-w-0"
    />

    <!-- Author identity. Stacks centred on a phone and goes side-by-side
         from `sm` up, so the portrait never eats the fold on mobile
         while desktop still reads as a proper profile header.

         Built from UAvatar + a native h1 rather than UUser: the author's
         name IS this page's heading, and UUser renders its name in a
         non-heading element. -->
    <header
      class="
        mb-8 flex flex-col items-center gap-5 text-center
        sm:flex-row sm:items-start sm:gap-6 sm:text-left
      "
    >
      <UAvatar
        :src="avatarSrc"
        :alt="authorName"
        :text="authorInitials"
        size="3xl"
        class="
          size-20 shrink-0 ring-2 ring-(--ui-border-accented)
          sm:size-24
        "
      />

      <div class="flex min-w-0 flex-col items-center gap-3 sm:items-start">
        <h1
          class="
            text-2xl font-bold text-primary-950
            md:text-3xl
            dark:text-primary-50
          "
        >
          {{ authorName }}
        </h1>

        <div class="flex flex-wrap items-center justify-center gap-2">
          <UBadge
            color="neutral"
            variant="subtle"
            icon="i-heroicons-document-text"
          >
            {{ t('stats.posts', { count: totalPosts }) }}
          </UBadge>
          <UBadge
            v-if="totalLikes"
            color="neutral"
            variant="subtle"
            icon="i-heroicons-heart"
          >
            {{ t('stats.likes', { count: totalLikes }) }}
          </UBadge>
        </div>

        <p
          v-if="authorBio"
          class="
            max-w-2xl text-sm text-pretty text-muted
            md:text-base
          "
        >
          {{ authorBio }}
        </p>

        <UButton
          v-if="author?.website"
          :to="author.website"
          :external="true"
          target="_blank"
          rel="noopener noreferrer nofollow"
          color="neutral"
          variant="link"
          size="sm"
          icon="i-heroicons-globe-alt"
          class="px-0"
        >
          {{ t('website') }}
        </UButton>
      </div>
    </header>

    <div class="flex w-full flex-col gap-4">
      <h2 class="sr-only">
        {{ t('articles') }}
      </h2>

      <div
        v-if="pagination"
        class="flex flex-row flex-wrap items-center gap-2"
      >
        <Pagination
          :count="pagination.count"
          :links="pagination.links"
          :loading="postStatus === 'pending'"
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :page-total-results="pagination.pageTotalResults"
          :pagination-type="paginationType"
          :total-pages="pagination.totalPages"
        />
        <Ordering
          :ordering="String(ordering)"
          :ordering-options="orderingOptions.orderingOptionsArray.value"
        />
      </div>

      <ol
        v-if="postStatus === 'success' && posts?.results?.length"
        class="
          grid grid-cols-1 items-center justify-center gap-4
          sm:grid-cols-2
          md:grid-cols-3
        "
      >
        <Component
          :is="BlogPostCard"
          v-for="(post, index) in posts?.results"
          :key="index"
          :img-loading="index > 7 ? 'lazy' : 'eager'"
          :post="post"
        />
      </ol>

      <div
        v-else-if="postStatus === 'pending'"
        class="
          grid grid-cols-1 items-center justify-center gap-4
          sm:grid-cols-2
          md:grid-cols-3
        "
      >
        <USkeleton
          v-for="i in 6"
          :key="i"
          class="h-[400px] w-full"
        />
      </div>

      <LazyEmptyState
        v-else
        class="w-full"
        :title="t('empty.title')"
        :description="t('empty.description')"
      >
        <template #icon>
          <UIcon
            name="i-heroicons-document-text"
            size="xl"
          />
        </template>
      </LazyEmptyState>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  page:
    title: "{name}: Άρθρα"
  articles: Άρθρα
  website: Ιστοσελίδα
  stats:
    posts: "{count} άρθρα"
    likes: "{count} μου αρέσει"
  empty:
    title: Κανένα άρθρο ακόμα
    description: Ο συντάκτης δεν έχει δημοσιεύσει άρθρα.
en:
  page:
    title: "{name}: Articles"
  articles: Articles
  website: Website
  stats:
    posts: "{count} articles"
    likes: "{count} likes"
  empty:
    title: No articles yet
    description: This author has not published any articles.
</i18n>
