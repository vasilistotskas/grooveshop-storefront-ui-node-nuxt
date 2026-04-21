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
  /**
   * Hide the section heading — useful on surfaces like the PDP where
   * the surrounding layout already gives the rail enough context and
   * an extra ``Είδες Πρόσφατα`` label would feel redundant.
   */
  hideTitle?: boolean
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

// Single mobile-first UI config. Using one set of Tailwind breakpoints
// (instead of JS-branching on ``useDevice().isMobileOrTablet``) means
// the layout stays correct regardless of whether the User-Agent is
// classified as mobile — critical in dev-tools device emulation where
// the UA often stays "desktop" while the viewport is 375px.
//
// * ``min-w-0 shrink-0 grow-0`` disables flex's natural width growth so
//   slides can't exceed their ``basis-*`` share.
// * ``overflow-hidden`` + ``w-full`` on viewport/container keep the
//   carousel strictly inside the parent regardless of slide count, so
//   the homepage's ``max-w-(--container-main)`` wrapper isn't overrun.
// * Responsive slide widths: 2 visible on mobile, 3 on tablet, 5 on
//   desktop — breakpoints align with ``MAX_ITEMS = 5`` so the full
//   history fits without scroll on lg+ screens.
const carouselUI = {
  root: 'w-full max-w-full',
  viewport: 'overflow-hidden w-full',
  container: 'flex w-full',
  item: `
    min-w-0 shrink-0 grow-0 basis-1/2
    md:basis-1/3
    lg:basis-1/5
  `,
}
</script>

<template>
  <ClientOnly>
    <section
      v-if="hasItems"
      :aria-labelledby="hideTitle ? undefined : 'recently-viewed-title'"
      :aria-label="hideTitle ? t('title') : undefined"
      class="w-full max-w-full space-y-4 overflow-hidden"
    >
      <header v-if="!hideTitle" class="flex items-center justify-between gap-3">
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

      <LazyUCarousel
        v-slot="{ item }"
        :items="visibleItems"
        :ui="carouselUI"
        :arrows="false"
        align="start"
        drag-free
        contain-scroll="trimSnaps"
        class="
          w-full max-w-full
          md:mx-auto
        "
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
              :width="280"
              :height="280"
              fit="contain"
              :background="'ffffff'"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
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
      </LazyUCarousel>
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
  title: "Είδες Πρόσφατα"
</i18n>
