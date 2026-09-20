<script lang="ts" setup>
/**
 * Live promotions, on a page that is not `/offers`.
 *
 * Gated on BOTH tiers of the promotions gate and on there being an
 * offer to show, so an operator can leave the band published between
 * campaigns and a store that switched promotions off does not keep
 * advertising them. The request itself is gated, not just the render.
 */
const props = defineProps<{
  title?: string
  heading?: string
  subheading?: string
  limit?: number
  ctaText?: string
  ctaLink?: string
  surface?: 'default' | 'muted'
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const tenantStore = useTenantStore()
const { copy, isSupported: clipboardSupported } = useClipboard()
const toast = useToast()

const promotionsRuntimeEnabled = useSettingFlag('PROMOTIONS_ENABLED', {
  fallback: false,
})
const enabled = computed(
  () => tenantStore.promotionsEnabled && promotionsRuntimeEnabled.value,
)

// `languageCode` and a locale-keyed cache entry, for the same reason as
// the `/offers` page: Django resolves an offer's name and description
// server-side, so without it this band renders the store's default
// language on every locale. It was the last Greek left on `/en`.
const { data } = await useFetch('/api/promotions', {
  key: () => `offers-preview-${locale.value}`,
  dedupe: 'defer',
  query: { languageCode: locale },
  immediate: enabled.value,
  server: enabled.value,
})

const offers = computed<PublicPromotion[]>(() => {
  if (!enabled.value) return []
  return (data.value ?? []).slice(0, props.limit ?? 3)
})

// Same affordance as the /offers page: a code is copied in one tap
// rather than selected by hand on a phone.
function onCopy(code: string) {
  copy(code)
  toast.add({ title: t('copied', { code }), color: 'success' })
}
</script>

<template>
  <PageSectionBand
    v-if="offers.length"
    :heading="heading || title || t('heading')"
    :subheading="subheading"
    :cta-text="ctaText || t('all_offers')"
    :cta-link="ctaLink ? localePath(ctaLink) : localePath('/offers')"
    :surface="surface ?? 'muted'"
  >
    <UPageGrid class="lg:grid-cols-3">
      <OffersCard
        v-for="offer in offers"
        :key="offer.id"
        :offer="offer"
        :clipboard-supported="clipboardSupported"
        @copy="onCopy"
      />
    </UPageGrid>
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  heading: Τρέχουσες προσφορές
  all_offers: Όλες οι προσφορές
  copied: 'Ο κωδικός {code} αντιγράφηκε'
en:
  heading: Current offers
  all_offers: All offers
  copied: 'Code {code} copied'
</i18n>
