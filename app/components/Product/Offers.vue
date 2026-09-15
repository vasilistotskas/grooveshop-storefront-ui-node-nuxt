<script lang="ts" setup>
/**
 * "This product has offers" — the product page's offer panel.
 *
 * Automatic promotions only reveal themselves once the cart already
 * qualifies, and a coupon only once it is typed, so a shopper standing
 * on a product page could not tell that this exact item is 20% off or
 * is the gift on a 59 € order. Django resolves scope and exclusions
 * with the same rules the cart engine uses and returns the RELATION
 * that makes each offer relevant, so nothing here is guessed from
 * `targetScope`.
 *
 * The specific offers (the promotion names this product, gives it away,
 * or targets its category) render open; store-wide ones collapse behind
 * a toggle. Every live promotion applies to every product on an
 * ORDER-scoped campaign, so leading with those would bury the one line
 * that is actually about the item in front of the shopper.
 *
 * Two-tier gate, fail CLOSED — plan flag AND merchant runtime setting,
 * the commercial-feature pattern. Django applies the same two tiers and
 * answers 404, so an ungated request renders nothing either way.
 */
const props = defineProps<{
  productId: number
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const toast = useToast()
const { copy, isSupported: clipboardSupported } = useClipboard()

const tenantStore = useTenantStore()
const promotionsRuntimeEnabled = useSettingFlag('PROMOTIONS_ENABLED', {
  fallback: false,
})
const promotionsEnabled = computed(
  () => tenantStore.promotionsEnabled && promotionsRuntimeEnabled.value,
)

const { data: offers } = await useFetch(
  () => `/api/promotions/product/${props.productId}`,
  {
    key: `product-offers-${props.productId}`,
    headers: useRequestHeaders(),
    // A store with promotions off answers 404; the panel renders
    // nothing rather than an error boundary on a product page.
    default: () => [],
  },
)

const rows = computed(() => (promotionsEnabled.value ? offers.value ?? [] : []))

/**
 * Store-wide offers are true of every product, so they are context
 * rather than news. Split rather than dropped: "free shipping over
 * 39 €" still helps the purchase decision, it just should not be the
 * first thing read.
 */
const specific = computed(() => rows.value.filter(o => o.relation !== 'ORDER'))
const storeWide = computed(() => rows.value.filter(o => o.relation === 'ORDER'))

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
  <section
    v-if="rows.length"
    class="rounded-lg border border-default bg-elevated/40"
    :aria-label="t('title')"
  >
    <h2
      class="
        flex items-center gap-2 border-b border-default px-4 py-3 text-sm
        font-semibold
      "
    >
      <UIcon name="i-heroicons-ticket" class="size-5 text-primary" />
      {{ t('title') }}
      <UBadge color="primary" variant="subtle" size="sm">
        {{ rows.length }}
      </UBadge>
    </h2>

    <ul class="list-none divide-y divide-default p-0">
      <ProductOfferRow
        v-for="offer in specific"
        :key="offer.id"
        :offer="offer"
        :clipboard-supported="clipboardSupported"
        @copy="copyCode"
      />
    </ul>

    <UCollapsible v-if="storeWide.length" :default-open="!specific.length">
      <UButton
        color="neutral"
        variant="ghost"
        block
        size="sm"
        trailing-icon="i-heroicons-chevron-down"
        class="
          justify-between rounded-none border-t border-default
          group
        "
        :ui="{ trailingIcon: `
          transition-transform
          group-data-[state=open]:rotate-180
        ` }"
        :label="t('store_wide', storeWide.length)"
      />

      <template #content>
        <ul class="list-none divide-y divide-default border-t border-default p-0">
          <ProductOfferRow
            v-for="offer in storeWide"
            :key="offer.id"
            :offer="offer"
            :clipboard-supported="clipboardSupported"
            @copy="copyCode"
          />
        </ul>
      </template>
    </UCollapsible>

    <div class="border-t border-default px-4 py-2">
      <UButton
        :to="localePath('offers')"
        color="neutral"
        variant="link"
        size="sm"
        trailing-icon="i-heroicons-arrow-right"
        class="px-0"
        :label="t('see_all')"
      />
    </div>
  </section>
</template>

<i18n lang="yaml">
el:
  title: Προσφορές για αυτό το προϊόν
  store_wide: '{n} προσφορά σε όλο το κατάστημα | {n} προσφορά σε όλο το κατάστημα | {n} προσφορές σε όλο το κατάστημα'
  see_all: Δες όλες τις προσφορές
en:
  title: Offers on this product
  store_wide: '{n} store-wide offer | {n} store-wide offer | {n} store-wide offers'
  see_all: See all offers
</i18n>
