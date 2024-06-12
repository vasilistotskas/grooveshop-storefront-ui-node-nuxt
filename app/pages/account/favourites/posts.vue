<script lang="ts" setup>
import emptyIcon from '~icons/mdi/package-variant-remove'
import type { EntityOrdering } from '~/types/ordering'
import type { BlogPost, BlogPostOrderingField } from '~/types/blog/post'

const { t } = useI18n()
const route = useRoute()
const { user } = useUserSession()

const pageSize = ref(4)
const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-createdAt')

const entityOrdering = ref<EntityOrdering<BlogPostOrderingField>>([
  {
    value: 'title',
    label: t('pages.account.favourites.posts.ordering.title'),
    options: ['ascending', 'descending'],
  },
  {
    value: 'createdAt',
    label: t('pages.account.favourites.posts.ordering.created_at'),
    options: ['ascending', 'descending'],
  },
  {
    value: 'updatedAt',
    label: t('pages.account.favourites.posts.ordering.updated_at'),
    options: ['ascending', 'descending'],
  },
])

const { data: favourites, pending } = await useFetch(
  `/api/user/account/${user.value?.id}/liked-blog-posts`,
  {
    method: 'GET',
    query: {
      page: page.value,
      ordering: ordering.value,
      pageSize: pageSize.value,
      expand: 'true',
    },
  },
)

const refreshFavourites = async () => {
  pending.value = true
  const favourites = await $fetch(
    `/api/user/account/${user.value?.id}/liked-blog-posts`,
    {
      method: 'GET',
      query: {
        page: page.value,
        ordering: ordering.value,
        pageSize: pageSize.value,
        expand: 'true',
      },
    },
  )
  pending.value = false
  return favourites
}

const pagination = computed(() => {
  if (!favourites.value) return
  return usePagination<BlogPost>(favourites.value)
})

const orderingOptions = computed(() => {
  return useOrdering<BlogPostOrderingField>(entityOrdering.value)
})

watch(
  () => route.query,
  async (newVal, oldVal) => {
    if (!deepEqual(newVal, oldVal)) {
      favourites.value = await refreshFavourites()
    }
  },
)

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      container flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle :text="$t('pages.account.favourites.posts.title')" />
    <DevOnly>
      <UserAccountFavouritesNavbar />
    </DevOnly>
    <PageBody>
      <div class="flex flex-row flex-wrap items-center gap-2">
        <PaginationPageNumber
          v-if="pagination"
          :count="pagination.count"
          :page-size="pagination.pageSize"
          :page="pagination.page"
        />
        <Ordering
          :ordering="String(ordering)"
          :ordering-options="orderingOptions.orderingOptionsArray.value"
        />
      </div>
      <BlogPostFavouritesList
        v-if="!pending && favourites?.results?.length"
        :favourites="favourites?.results"
        :favourites-count="favourites?.count"
      />
      <template v-if="pending">
        <div class="grid w-full items-start gap-4">
          <div class="flex w-full items-center justify-center">
            <ClientOnlyFallback
              class="w-full"
              height="20px"
              width="100%"
            />
          </div>
          <div
            class="
              grid grid-cols-2 gap-4

              lg:grid-cols-3

              xl:grid-cols-4
            "
          >
            <ClientOnlyFallback
              v-for="index in 4"
              :key="index"
              height="295px"
              width="100%"
            />
          </div>
        </div>
      </template>
      <EmptyState
        v-if="!pending && !favourites?.results?.length"
        :icon="emptyIcon"
      >
        <template #actions>
          <UButton
            :label="$t('common.empty.button')"
            :to="'index'"
            color="primary"
          />
        </template>
      </EmptyState>
    </PageBody>
  </PageWrapper>
</template>
