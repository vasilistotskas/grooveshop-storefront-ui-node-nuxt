<script lang="ts" setup>
/**
 * Public offers page.
 *
 * The store's promotion engine is fully functional but was invisible:
 * automatic promotions only reveal themselves once the cart already
 * qualifies, so a shopper could never learn that spending 80€ earns a
 * gift, or that a 2+1 is running, before building the cart. This page
 * is the discovery half.
 *
 * Gated by the `promotions-enabled` middleware (tenant plan flag AND
 * merchant runtime setting, both fail-closed). Django applies the same
 * two tiers to the endpoint, so an ungated request still gets nothing.
 *
 * The offer VOCABULARY (headline, conditions, expiry, colour, icon)
 * lives in `usePromotionOffer` because the product page's offer panel
 * and the checkout coupon picker render the same Django shape. This
 * page owns only its layout and its filter.
 */
const { t, locale } = useI18n()
const localePath = useLocalePath()
const toast = useToast()
const { copy, isSupported: clipboardSupported } = useClipboard()

useSeoMeta({
  title: () => t('title'),
  description: () => t('description'),
})

// `languageCode` is not optional in practice: Django resolves an
// offer's name and description server-side, so without it this page
// renders the store's default language whatever locale it is on. The
// key carries the locale too, or the first one fetched would be reused
// for the other.
const { data: offers } = await useFetch('/api/promotions', {
  key: () => `public-offers-${locale.value}`,
  headers: useRequestHeaders(),
  query: { languageCode: locale },
  default: () => [],
})

const all = computed(() => offers.value ?? [])

/**
 * One axis only. "Do I need a code?" is the question a shopper can act
 * on — a filter by benefit type would slice the same short list into
 * pieces nobody asked for.
 */
type Filter = 'all' | 'code' | 'automatic'
const filter = ref<Filter>('all')

const counts = computed(() => ({
  all: all.value.length,
  code: all.value.filter(offer => offer.trigger === 'CODE').length,
  automatic: all.value.filter(offer => offer.trigger === 'AUTOMATIC').length,
}))

// Below this the filter is furniture: it costs a row of chrome to split
// a list the shopper can already see in full.
const FILTER_THRESHOLD = 4
const showFilter = computed(
  () => all.value.length > FILTER_THRESHOLD
    && counts.value.code > 0
    && counts.value.automatic > 0,
)

const filters = computed(() => ([
  { value: 'all' as const, label: t('filter.all'), count: counts.value.all },
  { value: 'code' as const, label: t('filter.code'), count: counts.value.code },
  {
    value: 'automatic' as const,
    label: t('filter.automatic'),
    count: counts.value.automatic,
  },
]))

const rows = computed(() => {
  if (!showFilter.value || filter.value === 'all') return all.value
  const trigger = filter.value === 'code' ? 'CODE' : 'AUTOMATIC'
  return all.value.filter(offer => offer.trigger === trigger)
})

async function copyCode(code: string) {
  await copy(code)
  toast.add({
    title: t('promotion.code_copied'),
    description: code,
    color: 'success',
    icon: 'i-heroicons-clipboard-document-check',
  })
}
</script>

<template>
  <PageWrapper class="flex flex-col gap-6">
    <div class="flex flex-col gap-2">
      <PageTitle :text="t('title')" />
      <p class="max-w-prose text-muted">
        {{ t('description') }}
      </p>
    </div>

    <UEmpty
      v-if="!all.length"
      icon="i-heroicons-tag"
      :title="t('empty.title')"
      :description="t('empty.description')"
      :actions="[{
        label: t('empty.cta'),
        color: 'primary',
        to: localePath('products'),
      }]"
    />

    <template v-else>
      <!-- A segmented control rather than a select: three options that
           each carry a count are worth showing all at once. -->
      <UFieldGroup v-if="showFilter" size="sm" class="self-start">
        <UButton
          v-for="option in filters"
          :key="option.value"
          :color="filter === option.value ? 'primary' : 'neutral'"
          :variant="filter === option.value ? 'solid' : 'outline'"
          :aria-pressed="filter === option.value"
          @click="() => { filter = option.value }"
        >
          {{ option.label }}
          <UBadge
            :color="filter === option.value ? 'neutral' : 'primary'"
            variant="subtle"
            size="sm"
          >
            {{ option.count }}
          </UBadge>
        </UButton>
      </UFieldGroup>

      <UPageGrid class="sm:grid-cols-2 lg:grid-cols-3">
        <OffersCard
          v-for="offer in rows"
          :key="offer.id"
          :offer="offer"
          :clipboard-supported="clipboardSupported"
          @copy="copyCode"
        />
      </UPageGrid>
    </template>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Προσφορές
  description: Όλες οι ενεργές προσφορές του καταστήματος, σε ένα σημείο. Οι αυτόματες εφαρμόζονται μόνες τους στο καλάθι — για τις υπόλοιπες αντίγραψε τον κωδικό και βάλ' τον στο ταμείο.
  filter:
    all: Όλες
    code: Με κωδικό
    automatic: Αυτόματες
  empty:
    title: Δεν υπάρχουν ενεργές προσφορές
    description: Έλεγξε ξανά σύντομα — προσθέτουμε νέες προσφορές τακτικά.
    cta: Δες τα προϊόντα
en:
  title: Offers
  description: Every active offer in the store, in one place. Automatic ones apply themselves at the basket — for the rest, copy the code and paste it at checkout.
  filter:
    all: All
    code: With a code
    automatic: Automatic
  empty:
    title: No active offers
    description: Check back soon — we add new offers regularly.
    cta: Browse the products
</i18n>
