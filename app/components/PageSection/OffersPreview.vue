<script lang="ts" setup>
/**
 * Live promotions, on a page that is not `/offers`: the ink band, with
 * each offer as a coupon whose code copies in one tap, and a link to
 * the rest that says how many there are.
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
  /**
   * Accepted from the layout, not drawn: the design sets the offers on
   * the ink surface, and the page-config schema cannot ask for it yet
   * (PLAN F11 adds `inverted` to the band's choices).
   */
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
const { data } = await useApi('/api/promotions', {
  key: () => `offers-preview-${locale.value}`,
  dedupe: 'defer',
  query: { languageCode: locale },
  immediate: enabled.value,
  server: enabled.value,
  // The band hydrates when it scrolls into view, after the app has
  // finished hydrating — see app/utils/payloadCachedData.ts.
  getCachedData: payloadCachedData,
})

const live = computed<PublicPromotion[]>(() => (enabled.value ? data.value ?? [] : []))
const offers = computed(() => live.value.slice(0, props.limit ?? 3))

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
    :eyebrow="t('eyebrow')"
    :heading="heading || title || t('heading')"
    :subheading="subheading"
    :cta-text="ctaText || t('all_offers', { count: live.length }, live.length)"
    :cta-link="ctaLink ? localePath(ctaLink) : localePath('/offers')"
    surface="inverted"
    heading-size="lg"
  >
    <ul
      class="
        grid gap-3.5
        lg:grid-cols-3 lg:gap-5
      "
    >
      <li
        v-for="offer in offers"
        :key="offer.id"
        class="flex"
      >
        <OffersCoupon
          :offer="offer"
          :clipboard-supported="clipboardSupported"
          class="w-full"
          @copy="onCopy"
        />
      </li>
    </ul>
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  eyebrow: Τρέχουσες προσφορές
  heading: Κωδικοί που όντως ισχύουν.
  all_offers: 'Δες την προσφορά | Όλες οι {count} προσφορές'
  copied: 'Ο κωδικός {code} αντιγράφηκε'
en:
  eyebrow: Running offers
  heading: Codes that actually work.
  all_offers: 'See the offer | All {count} offers'
  copied: 'Code {code} copied'
</i18n>
