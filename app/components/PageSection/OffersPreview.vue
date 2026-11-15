<script lang="ts" setup>
/**
 * Live promotions, on a page that is not `/offers`: the ink band, with
 * each offer as a coupon whose code copies in one tap, and a link to
 * the rest that says how many there are.
 *
 * The offers arrive read (`offers`, a data setting the page route
 * resolved: the first few, and how many are running in all). The block is
 * gated on the store's promotions feature, so a store that switched them
 * off does not keep advertising them, and the band draws nothing between
 * campaigns, so an operator can leave it published.
 */
const props = withDefaults(defineProps<{
  eyebrow?: string
  heading?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  /** The design sets the offers on ink; a layout may ask for a lighter ground. */
  surface?: 'default' | 'muted' | 'ink'
  /** What the band shows: the first offers, and how many are running in all. */
  offers: ResolvedQuery<DataItems['promotion'], DataDescriptor<'promotion'>>
}>(), {
  surface: 'ink',
})

const { t } = useStoreI18n('components/PageSection/OffersPreview')
const localePath = useLocalePath()
const linkTo = useLinkTo()
const { copy, isSupported: clipboardSupported } = useClipboard()
const toast = useToast()

// Same affordance as the /offers page: a code is copied in one tap
// rather than selected by hand on a phone.
function onCopy(code: string) {
  copy(code)
  toast.add({ title: t('copied', { code }), color: 'success' })
}
</script>

<template>
  <PageSectionBand
    v-if="offers.items.length"
    :eyebrow="eyebrow || t('eyebrow')"
    :heading="heading || t('heading')"
    :subheading="subheading"
    :cta-text="ctaText || t('all_offers', { count: offers.total }, offers.total)"
    :cta-link="ctaLink ? linkTo(ctaLink) : localePath('offers')"
    :surface="props.surface === 'ink' ? 'inverted' : props.surface"
    heading-size="lg"
  >
    <ul
      class="
        grid gap-3.5
        lg:grid-cols-3 lg:gap-5
      "
    >
      <li
        v-for="offer in offers.items"
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
