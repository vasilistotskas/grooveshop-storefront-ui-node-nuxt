<script lang="ts" setup>
/**
 * The last tile of a product grid that also lists the store's categories
 * (`products_grid`'s `categories`): a dashed tile in the grid's own cell,
 * "find what you are after by category", each category a link with how many
 * products it holds, and a link to the whole shop. A desk's tile: on a phone
 * the band's own button leads to the shop, so the tile is not drawn there.
 *
 * Renders nothing without a category. Every colour is a token, so it follows
 * a band forced light or dark in every design.
 */
const props = defineProps<{
  categories: readonly ProductCategory[]
}>()

const { t, n, locale } = useStoreI18n('components/PageSection/ProductsCategoryTile')
const localePath = useLocalePath()

const entries = computed(() => props.categories.map(category => categoryMenuEntry(category, locale.value)))
</script>

<template>
  <li
    v-if="entries.length"
    class="
      flex flex-col justify-between gap-5 rounded-lg border border-dashed
      border-default bg-muted p-6 text-highlighted
      max-sm:hidden
    "
  >
    <div>
      <p
        class="
          text-[0.8125rem] font-bold tracking-[0.06em] text-muted uppercase
        "
      >
        {{ t('eyebrow') }}
      </p>
      <p class="mt-2.5 text-[1.375rem]/[1.25] font-extrabold text-balance">
        {{ t('title') }}
      </p>
    </div>
    <ul class="flex flex-col text-[0.9375rem]">
      <li
        v-for="entry in entries"
        :key="entry.id"
        class="border-t border-default"
      >
        <NuxtLink
          :to="localePath(pathLocation(entry.to))"
          class="
            flex min-h-11 items-center justify-between gap-3 py-2.5
            hover:text-accent
            focus-visible:outline-2 focus-visible:outline-secondary
          "
        >
          <span class="min-w-0 font-semibold wrap-break-word">{{ entry.label }}</span>
          <span class="shrink-0 text-muted tabular-nums">{{ n(entry.productCount) }}</span>
        </NuxtLink>
      </li>
    </ul>
    <NuxtLink
      :to="localePath('products')"
      class="
        inline-flex min-h-11 items-center gap-1.5 self-start text-[0.9375rem]
        font-semibold text-accent
        hover:underline
        focus-visible:outline-2 focus-visible:outline-secondary
      "
    >
      {{ t('all_shop') }}
      <UIcon
        name="i-lucide-arrow-right"
        class="size-4"
      />
    </NuxtLink>
  </li>
</template>

<i18n lang="yaml">
el:
  eyebrow: Ανά κατηγορία
  title: Βρες γρήγορα αυτό που ψάχνεις
  all_shop: Όλο το κατάστημα
en:
  eyebrow: By category
  title: Find what you are after, fast
  all_shop: The whole shop
</i18n>
