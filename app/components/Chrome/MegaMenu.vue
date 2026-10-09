<script lang="ts" setup>
/**
 * The Shop dropdown's panel: the catalogue's roots as columns, each
 * with its children, and the listing's shortcuts underneath.
 *
 * Rendered by the header's `UNavigationMenu` as the Shop item's content
 * slot, so it opens and closes with the menu's own hover, focus and
 * keyboard handling — this component only lays out what it is given.
 *
 * The shortcuts are listing views that exist: newest first and most
 * viewed are sorts the catalogue offers (`sort=-createdAt`,
 * `sort=-viewCount`), and the offers page is linked only for a store
 * that runs promotions.
 */
defineProps<{
  categories: CategoryMenuEntry[]
  offersEnabled: boolean
}>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <UContainer>
    <div class="grid grid-cols-4 gap-8 pt-9 pb-10">
      <div
        v-for="category in categories"
        :key="category.id"
        class="flex flex-col gap-3"
      >
        <ULink
          :to="localePath(pathLocation(category.to))"
          class="
            flex items-center gap-1.5 text-base font-extrabold
            text-highlighted
          "
        >
          {{ category.label }}
          <UIcon
            name="i-heroicons-arrow-right"
            class="size-4"
          />
        </ULink>
        <ULink
          v-for="child in category.children"
          :key="child.id"
          :to="localePath(pathLocation(child.to))"
          class="
            text-[0.9375rem] font-semibold text-muted
            hover:text-highlighted
          "
        >
          {{ child.label }}
        </ULink>
      </div>
    </div>

    <div class="flex flex-wrap gap-2.5 pb-7">
      <UButton
        :to="localePath('products')"
        :label="t('all_products')"
        color="neutral"
        variant="outline"
        size="sm"
      />
      <UButton
        :to="localePath({ path: '/products', query: { sort: '-createdAt' } })"
        :label="t('new_arrivals')"
        color="neutral"
        variant="outline"
        size="sm"
      />
      <UButton
        :to="localePath({ path: '/products', query: { sort: '-viewCount' } })"
        :label="t('most_viewed')"
        color="neutral"
        variant="outline"
        size="sm"
      />
      <UButton
        v-if="offersEnabled"
        :to="localePath('offers')"
        :label="t('on_offer')"
        color="neutral"
        variant="outline"
        size="sm"
      />
    </div>
  </UContainer>
</template>

<i18n lang="yaml">
el:
  all_products: Όλα τα προϊόντα
  new_arrivals: Νέες αφίξεις
  most_viewed: Δημοφιλή
  on_offer: Σε προσφορά
en:
  all_products: All products
  new_arrivals: New arrivals
  most_viewed: Most viewed
  on_offer: On offer
</i18n>
