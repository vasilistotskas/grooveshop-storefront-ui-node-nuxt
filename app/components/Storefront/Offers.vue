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
const { data: offers } = await useApi('/api/promotions', {
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
  { value: 'all' as const, label: t('filter.all'), badge: counts.value.all },
  { value: 'code' as const, label: t('filter.code'), badge: counts.value.code },
  { value: 'automatic' as const, label: t('filter.automatic'), badge: counts.value.automatic },
]))

const breadcrumb = computed(() => [{ label: t('title') }])

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
    icon: 'i-lucide-clipboard-check',
  })
}
</script>

<template>
  <UContainer class="flex flex-col gap-6 pt-6 pb-14 lg:gap-8 lg:pb-22">
    <PageBreadcrumb :items="breadcrumb" />

    <header class="flex flex-col gap-2">
      <h1
        class="
          font-display text-[1.875rem]/[1.1] font-bold tracking-[-0.02em]
          text-highlighted
          lg:text-[2.25rem]/[1.1]
        "
      >
        {{ t('title') }}
      </h1>
      <p class="max-w-prose text-toned">
        {{ t('description') }}
      </p>
    </header>

    <UEmpty
      v-if="!all.length"
      icon="i-lucide-tag"
      :title="t('empty.title')"
      :description="t('empty.description')"
      :actions="[{
        label: t('empty.cta'),
        color: 'neutral',
        to: localePath('products'),
      }]"
    />

    <template v-else>
      <!-- A segmented control rather than a select: three options that
           each carry a count are worth showing all at once. -->
      <UTabs
        v-if="showFilter"
        :model-value="filter"
        :items="filters"
        :content="false"
        color="neutral"
        variant="pill"
        size="sm"
        class="self-start"
        :ui="{ root: 'w-auto' }"
        @update:model-value="(value: string | number) => { filter = value as Filter }"
      />

      <ul class="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        <li
          v-for="offer in rows"
          :key="offer.id"
          class="flex"
        >
          <OffersCard
            :offer="offer"
            :clipboard-supported="clipboardSupported"
            class="w-full"
            @copy="copyCode"
          />
        </li>
      </ul>
    </template>
  </UContainer>
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
