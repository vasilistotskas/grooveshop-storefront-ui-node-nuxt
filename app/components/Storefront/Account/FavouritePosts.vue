<script lang="ts" setup>
/** The blog posts the shopper liked, as the blog lists them. */
const { t } = useI18n()
useHead({ title: () => t('title') })
const route = useRoute()
const localePath = useLocalePath()
const { user } = useUserSession()

const PAGE_SIZE = 12
const page = computed(() => Math.max(1, Number(route.query.page) || 1))

const { data: posts, status } = await useApi(`/api/user/account/${user.value?.id}/liked-blog-posts`, {
  key: `favourite-posts-${user.value?.id}`,
  method: 'GET',
  query: { page, pageSize: PAGE_SIZE, ordering: '-createdAt' },
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader
      :title="t('title')"
      :lead="t('lead')"
    />
    <AccountFavouritesTabs current="posts" />

    <div
      v-if="status === 'pending' && !posts"
      class="grid gap-4 sm:grid-cols-2"
    >
      <USkeleton
        v-for="index in 2"
        :key="index"
        class="h-72 rounded-[1.25rem]"
      />
    </div>

    <ul
      v-else-if="posts?.results.length"
      class="grid gap-4 sm:grid-cols-2"
    >
      <li
        v-for="post in posts.results"
        :key="post.id"
      >
        <BlogPostCard :post="post" />
      </li>
    </ul>

    <div
      v-else
      class="flex flex-col items-start gap-3 rounded-[1.25rem] bg-default p-6 ring ring-default"
    >
      <p class="font-semibold text-highlighted">
        {{ t('empty.title') }}
      </p>
      <p class="text-toned">
        {{ t('empty.description') }}
      </p>
      <UButton
        :label="t('empty.cta')"
        :to="localePath('blog')"
        color="neutral"
      />
    </div>

    <UPagination
      v-if="posts && posts.count > PAGE_SIZE"
      :page="page"
      :total="posts.count"
      :items-per-page="PAGE_SIZE"
      :to="(target: number) => ({ query: { ...route.query, page: target > 1 ? target : undefined } })"
      class="self-center"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  title: Αγαπημένα
  lead: Τα προϊόντα και τα άρθρα που αποθήκευσες.
  empty:
    title: Κανένα αγαπημένο άρθρο ακόμα
    description: Πάτα την καρδιά σε ένα άρθρο για να το βρίσκεις εδώ.
    cta: Δες το blog
en:
  title: Favourites
  lead: The products and posts you saved.
  empty:
    title: No favourite posts yet
    description: Tap the heart on a post to keep it here.
    cta: Read the blog
</i18n>
