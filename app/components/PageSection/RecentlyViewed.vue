<script lang="ts" setup>
/**
 * The products this visitor was just looking at.
 *
 * The history lives in localStorage, so the band is client-only by
 * construction — and it must decide for ITSELF whether there is
 * anything to show, because a band that paints its ground and its
 * padding around an empty rail is a blank screenful on every
 * first-time visitor.
 *
 * Gated by the store's `recentlyViewed` preference
 * (`TenantConfig.preferences`), which every render already has.
 */
const props = defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
}>()

const { t } = useStoreI18n('components/PageSection/RecentlyViewed')

const recentlyViewedEnabled = useStorePreference('recentlyViewed')

const { items } = useRecentlyViewed()

const label = computed(() => props.heading || props.title || t('heading'))
</script>

<template>
  <ClientOnly>
    <PageSectionBand
      v-if="recentlyViewedEnabled && items.length"
      :heading="label"
      surface="muted"
    >
      <!-- The rail's own heading would be a second one inside the
           band's; the band already says what this is. -->
      <ProductRecentlyViewed hide-title />
    </PageSectionBand>
  </ClientOnly>
</template>

<i18n lang="yaml">
el:
  heading: Είδες πρόσφατα
en:
  heading: Recently viewed
</i18n>
