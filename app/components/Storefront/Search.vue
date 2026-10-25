<script lang="ts" setup>
/**
 * The search page: one big field, what others search for under it, then
 * the products found — with the guides that match beside them — or the
 * guides alone on their own tab. The searches and the URL state are
 * `useStorefrontSearch`'s.
 */
const { t, locale } = useI18n()

/** How many guides sit beside the products. */
const ASIDE_GUIDES = 3

const {
  blogEnabled,
  query,
  tab,
  page,
  limit,
  draft,
  commitDraft,
  search,
  linkTo,
  hasQuery,
  products,
  guides,
  productCount,
  guideCount,
  openCount,
  pending,
  relaxedQuery,
  selectTab,
  pageLink,
  changeLimit,
  onProductClick,
  onGuideClick,
} = await useStorefrontSearch({ asideGuides: ASIDE_GUIDES })

const trending = useLazyApi<TrendingSearchResponse>('/api/search/trending', {
  query: { languageCode: locale, contentType: 'product', limit: 4 },
})
const trendingQueries = computed(() => (trending.data.value?.results ?? []).map(result => result.query))

const tabItems = computed(() => [
  { value: 'products', label: t('tabs.products'), badge: productCount.value },
  ...(blogEnabled.value ? [{ value: 'guides', label: t('tabs.guides'), badge: guideCount.value }] : []),
])

const limitOptions = computed(() => [12, 24, 48].map(value => ({ label: t('per_page', { n: value }), value })))

useHead({
  title: () => query.value ? t('title_query', { query: query.value }) : t('title'),
})
</script>

<template>
  <UContainer class="flex flex-col pt-5 pb-12 lg:pt-10 lg:pb-22">
    <PageBreadcrumb :items="[{ label: t('title') }]" />
    <h1 class="sr-only">
      {{ query ? t('title_query', { query }) : t('title') }}
    </h1>

    <div class="mx-auto mt-5 w-full max-w-205 lg:mt-7">
      <UInput
        v-model="draft"
        icon="i-heroicons-magnifying-glass"
        :placeholder="t('placeholder')"
        :aria-label="t('title')"
        autofocus
        class="w-full"
        :ui="{
          base: `
            h-13 rounded-full ps-12 text-base font-semibold
            lg:h-16 lg:ps-13 lg:text-[1.1875rem]
          `,
          leading: `
            ps-4.5
            lg:ps-5
          `,
          leadingIcon: `
            size-5
            lg:size-6
          `,
          trailing: 'gap-2 pe-2.5',
        }"
        @update:model-value="commitDraft"
      >
        <template #trailing>
          <UButton
            v-if="draft"
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="t('clear')"
            @click="() => search('')"
          />
        </template>
      </UInput>
    </div>

    <div
      v-if="trendingQueries.length"
      class="mt-4 flex flex-wrap items-center justify-center gap-2"
    >
      <span class="text-[0.8125rem] font-semibold text-muted">{{ t('trending') }}</span>
      <UButton
        v-for="term in trendingQueries"
        :key="term"
        :to="linkTo({ query: term })"
        color="neutral"
        variant="outline"
        size="xs"
        :label="term"
        class="text-[0.8125rem]"
      />
    </div>

    <template v-if="hasQuery">
      <div
        class="
          mt-8 flex items-end justify-between gap-4 border-b border-default
          lg:mt-11
        "
      >
        <UTabs
          :model-value="tab"
          :items="tabItems"
          :content="false"
          variant="link"
          color="neutral"
          :ui="{ list: 'gap-6 border-0',
                 trigger: `px-1 pb-3 text-[0.9375rem] font-semibold`,
                 indicator: `h-0.5` }"
          @update:model-value="selectTab"
        >
          <template #trailing="{ item }">
            <UBadge
              :label="String(item.badge)"
              :color="item.value === tab ? 'primary' : 'neutral'"
              :variant="item.value === tab ? 'solid' : 'soft'"
              size="sm"
            />
          </template>
        </UTabs>

        <div class="hidden items-center gap-2 pb-2 lg:flex">
          <p class="text-sm text-muted">
            <i18n-t
              keypath="results"
              :plural="openCount"
            >
              <template #count>
                {{ openCount }}
              </template>
              <template #query>
                <strong class="text-highlighted">“{{ query }}”</strong>
              </template>
            </i18n-t>
          </p>
          <USelect
            :model-value="limit"
            :items="limitOptions"
            value-key="value"
            :aria-label="t('per_page_label')"
            :ui="{ base: 'h-9 rounded-full ps-3.5 font-semibold ring-default' }"
            @update:model-value="changeLimit"
          />
        </div>
      </div>

      <div
        v-if="openCount"
        role="status"
        class="
          mt-5 hidden gap-3 rounded-[0.875rem] bg-(--ui-info-soft) px-4 py-3.5
          text-info
          lg:flex
        "
      >
        <UIcon
          name="i-heroicons-sparkles"
          class="mt-0.5 size-5 shrink-0"
        />
        <div class="flex flex-col gap-0.5 text-sm">
          <strong>{{ relaxedQuery ? t('relaxed', { query: relaxedQuery }) : t('forgiving.title') }}</strong>
          <span class="text-toned">{{ t('forgiving.body') }}</span>
        </div>
      </div>

      <div
        v-if="pending && !openCount"
        class="mt-6 grid grid-cols-2 gap-3.5 lg:grid-cols-3 lg:gap-6"
      >
        <ProductCardSkeleton
          v-for="i in 6"
          :key="i"
        />
      </div>

      <UEmpty
        v-else-if="!openCount"
        icon="i-heroicons-magnifying-glass-minus"
        :title="t('empty.title')"
        :description="t('empty.description', { query })"
        class="mt-10"
      />

      <div
        v-else-if="tab === 'products'"
        class="
          mt-6 grid gap-10
          lg:grid-cols-[minmax(0,1fr)_21.25rem]
        "
      >
        <div class="flex flex-col gap-10">
          <ol class="grid grid-cols-2 gap-3.5 lg:grid-cols-3 lg:gap-6">
            <ProductCard
              v-for="(product, index) in products?.results ?? []"
              :key="product.id"
              :product="product as unknown as Product"
              :img-loading="index > 5 ? 'lazy' : 'eager'"
              @click.capture="onProductClick(product, index)"
            />
          </ol>
          <ProductsPagination
            v-if="productCount > limit"
            :page="page"
            :total="productCount"
            :items-per-page="limit"
            :to="pageLink"
          />
        </div>

        <aside
          v-if="guides?.results.length"
          class="hidden flex-col gap-3 lg:flex"
          :aria-labelledby="'search-guides-heading'"
        >
          <h2
            id="search-guides-heading"
            class="text-[0.9375rem] font-extrabold text-highlighted"
          >
            {{ t('from_guides') }}
          </h2>
          <SearchGuideCard
            v-for="(post, index) in guides.results"
            :key="post.id"
            :post="post"
            @click="onGuideClick(post, index)"
          />
        </aside>
      </div>

      <div
        v-else
        class="mt-6 flex flex-col gap-10"
      >
        <ul class="grid gap-3 lg:grid-cols-2">
          <li
            v-for="(post, index) in guides?.results ?? []"
            :key="post.id"
          >
            <SearchGuideCard
              :post="post"
              @click="onGuideClick(post, index)"
            />
          </li>
        </ul>
        <ProductsPagination
          v-if="guideCount > limit"
          :page="page"
          :total="guideCount"
          :items-per-page="limit"
          :to="pageLink"
        />
      </div>
    </template>

    <UEmpty
      v-else
      icon="i-heroicons-magnifying-glass"
      :title="t('start.title')"
      :description="t('start.description')"
      class="mt-12"
    />
  </UContainer>
</template>

<i18n lang="yaml">
el:
  title: Αναζήτηση
  title_query: "Αναζήτηση: {query}"
  placeholder: Τι ψάχνεις;
  clear: Καθαρισμός αναζήτησης
  trending: "Δημοφιλή:"
  tabs:
    products: Προϊόντα
    guides: Οδηγοί
  results: "{count} αποτέλεσμα για {query} | {count} αποτελέσματα για {query}"
  per_page: "{n} ανά σελίδα"
  per_page_label: Αποτελέσματα ανά σελίδα
  relaxed: "Δεν βρήκαμε κάτι ακριβώς γι' αυτό — δείχνουμε αποτελέσματα για «{query}»"
  forgiving:
    title: Βρίσκουμε ό,τι ψάχνεις, όπως κι αν το γράψεις
    body: Τα greeklish και τα ορθογραφικά λάθη αναγνωρίζονται αυτόματα.
  from_guides: Από τους οδηγούς
  empty:
    title: Δεν βρέθηκαν αποτελέσματα
    description: "Τίποτα για «{query}». Δοκίμασε μια πιο γενική λέξη ή ένα από τα δημοφιλή."
  start:
    title: Ξεκίνα την αναζήτηση
    description: Γράψε το όνομα ενός προϊόντος, μιας μάρκας ή ενός θέματος.
en:
  title: Search
  title_query: "Search: {query}"
  placeholder: What are you looking for?
  clear: Clear the search
  trending: "Trending:"
  tabs:
    products: Products
    guides: Guides
  results: "{count} result for {query} | {count} results for {query}"
  per_page: "{n} per page"
  per_page_label: Results per page
  relaxed: "Nothing matched exactly — showing results for “{query}”"
  forgiving:
    title: We find what you mean, however you type it
    body: Greeklish and typos are understood automatically.
  from_guides: From the guides
  empty:
    title: No results found
    description: "Nothing for “{query}”. Try a broader word or one of the trending searches."
  start:
    title: Start your search
    description: Type the name of a product, a brand or a topic.
</i18n>
