<script lang="ts" setup>
// The author page's drawing; the author, their posts and the head are
// useBlogAuthorPage's.
const { t } = useStoreI18n('components/Storefront/BlogAuthor')
const route = useRoute()
const localePath = useLocalePath()

// Initials on the accent's soft tint, as the board draws the author.
const AVATAR_UI = { root: 'bg-(--ui-secondary-soft)', fallback: 'font-display font-bold text-accent' }

const {
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
} = await useBlogAuthorPage({ documentTitle: name => t('page.title', { name }) })

// The heading names the author by first name, as the board does; an
// author without one falls back to the full name.
const firstName = computed(() => author.value?.user?.firstName || authorName.value)

const items = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
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
</script>

<template>
  <UContainer class="flex flex-col gap-8 py-6 lg:py-10">
    <UBreadcrumb
      :items="items"
      class="min-w-0"
    />

    <!-- Author identity, on one card. The author's name IS this page's
         heading, so it is a native h1 rather than UUser's name. -->
    <header
      class="
        flex flex-col gap-5 rounded-[1.25rem] bg-default p-5 ring ring-default
        sm:flex-row sm:items-center sm:gap-8 sm:p-8
      "
    >
      <UAvatar
        :src="avatarSrc"
        :alt="authorName"
        class="size-24 shrink-0 text-3xl sm:size-28"
        :ui="AVATAR_UI"
      />

      <div class="flex min-w-0 flex-1 flex-col items-start gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            color="neutral"
            variant="subtle"
            :label="t('stats.posts', { count: totalPosts }, totalPosts)"
          />
          <UBadge
            v-if="totalLikes"
            color="neutral"
            variant="subtle"
            :label="t('stats.likes', { count: totalLikes }, totalLikes)"
          />
        </div>

        <h1 class="font-display text-4xl/none font-bold tracking-tight text-highlighted lg:text-5xl/none">
          {{ authorName }}
        </h1>

        <div
          v-if="authorBioText"
          class="author-bio max-w-2xl text-pretty text-toned"
          v-html="authorBioHtml"
        />
      </div>

      <UButton
        v-if="author?.website"
        :to="author.website"
        :external="true"
        target="_blank"
        rel="noopener noreferrer nofollow"
        :aria-label="t('website')"
        icon="i-lucide-globe"
        color="neutral"
        variant="outline"
        class="rounded-full sm:self-start"
      />
    </header>

    <section
      aria-labelledby="author-posts-heading"
      class="flex w-full flex-col gap-6"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="author-posts-heading"
          class="font-display text-2xl font-bold text-highlighted"
        >
          {{ t('articles', { name: firstName }) }}
        </h2>
        <Ordering
          v-if="pagination"
          :ordering="String(ordering)"
          :ordering-options="orderingOptions.orderingOptionsArray.value"
        />
      </div>

      <ol
        v-if="postStatus === 'success' && posts?.results?.length"
        class="
          grid grid-cols-1 gap-6
          sm:grid-cols-2
          lg:grid-cols-3
        "
      >
        <BlogPostCard
          v-for="(post, index) in posts?.results"
          :key="post.id"
          :post="post"
          heading-level="h3"
          :img-loading="index < 3 ? 'eager' : 'lazy'"
          :img-fetch-priority="index === 0 ? 'high' : 'auto'"
          :preload="index === 0"
        />
      </ol>

      <div
        v-else-if="postStatus === 'pending'"
        class="
          grid grid-cols-1 gap-6
          sm:grid-cols-2
          lg:grid-cols-3
        "
      >
        <USkeleton
          v-for="i in 6"
          :key="i"
          class="h-[400px] w-full rounded-[1.25rem]"
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
            name="i-lucide-file-text"
            size="xl"
          />
        </template>
      </LazyEmptyState>

      <div
        v-if="pagination"
        class="flex justify-center"
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
      </div>
    </section>
  </UContainer>
</template>

<style scoped>
/* The bio is operator-authored rich text. Only what a bio holds is
   styled: paragraph rhythm and links. The shared `.article` prose class
   belongs to the webside design and is not reused here. */
.author-bio :deep(p) {
  margin-block: 0.5rem;
}

.author-bio :deep(p:first-child) {
  margin-top: 0;
}

.author-bio :deep(p:last-child) {
  margin-bottom: 0;
}

.author-bio :deep(a) {
  color: var(--ui-secondary-text, var(--ui-secondary));
  text-decoration: underline;
}
</style>

<i18n lang="yaml">
el:
  page:
    title: "{name}: Άρθρα"
  articles: "Άρθρα από {name}"
  website: Ιστοσελίδα
  stats:
    posts: "{count} άρθρο | {count} άρθρα"
    likes: "{count} μου αρέσει"
  empty:
    title: Κανένα άρθρο ακόμα
    description: Ο συντάκτης δεν έχει δημοσιεύσει άρθρα.
en:
  page:
    title: "{name}: Articles"
  articles: "Posts by {name}"
  website: Website
  stats:
    posts: "{count} post | {count} posts"
    likes: "{count} like | {count} likes"
  empty:
    title: No articles yet
    description: This author has not published any articles.
</i18n>
