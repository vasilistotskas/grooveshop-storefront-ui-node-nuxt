<script lang="ts" setup>
const props = defineProps<{
  /**
   * When rendered on a PDP, pass the current product id so the carousel
   * filters it out — otherwise you'd be recommending the page the user
   * is already on.
   */
  excludeProductId?: number | null
  /**
   * Max items to display (defaults to the full stored set). Provided so
   * the homepage rail can cap to fewer than the PDP rail if the design
   * calls for it later.
   */
  limit?: number
}>()

const { t } = useI18n()
const { productUrl } = useUrls()
const { $i18n } = useNuxtApp()

const { itemsExcluding } = useRecentlyViewed()
const visibleItems = computed(() => {
  const source = itemsExcluding(props.excludeProductId).value
  return typeof props.limit === 'number' ? source.slice(0, props.limit) : source
})

// Gracefully hide the whole section when empty — SSR renders nothing so
// there's no CLS hit when localStorage hydrates with an empty history.
const hasItems = computed(() => visibleItems.value.length > 0)
</script>

<template>
  <ClientOnly>
    <section
      v-if="hasItems"
      aria-labelledby="recently-viewed-title"
      class="space-y-4"
    >
      <header class="flex items-center justify-between gap-3">
        <h2
          id="recently-viewed-title"
          class="
            text-xl font-semibold text-primary-950
            dark:text-primary-50
          "
        >
          {{ t('title') }}
        </h2>
      </header>

      <ul
        class="
          grid grid-flow-col auto-cols-[minmax(160px,1fr)] gap-4 overflow-x-auto
          pb-2
          sm:auto-cols-[minmax(180px,1fr)]
          lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-4
          xl:grid-cols-5
        "
      >
        <li
          v-for="item in visibleItems"
          :key="item.id"
          class="min-w-0"
        >
          <NuxtLinkLocale
            :to="productUrl(item.id, item.slug ?? '')"
            class="
              group flex h-full flex-col gap-2 rounded-lg border border-neutral-200
              bg-white p-3 transition-shadow
              hover:shadow-md
              focus-visible:outline-2 focus-visible:outline-primary-500
              dark:border-neutral-800 dark:bg-neutral-900
            "
          >
            <div class="relative aspect-square overflow-hidden rounded-md bg-neutral-50 dark:bg-neutral-800">
              <ImgWithFallback
                :src="item.mainImagePath ?? undefined"
                :alt="item.name"
                :width="320"
                :height="320"
                fit="contain"
                :background="'ffffff'"
                sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 200px"
                loading="lazy"
                class="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <p
              class="
                line-clamp-2 text-sm font-medium text-primary-950
                dark:text-primary-50
              "
            >
              {{ item.name }}
            </p>
            <p
              v-if="item.finalPrice != null"
              class="text-sm font-semibold text-secondary-600 dark:text-secondary-400"
            >
              {{ $i18n.n(item.finalPrice, 'currency') }}
            </p>
          </NuxtLinkLocale>
        </li>
      </ul>
    </section>

    <template #fallback>
      <!--
        Suppress SSR entirely: the history is client-only and rendering
        an empty shell then swapping in the carousel would flash an
        empty heading. ClientOnly's fallback keeps layout neutral.
      -->
    </template>
  </ClientOnly>
</template>

<i18n lang="yaml">
el:
  title: "Πρόσφατα είδες"
</i18n>
