<script lang="ts" setup>
/**
 * "Offers for this product" — the card under the product's buy button.
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
 * or targets its category) are listed open and counted in the header;
 * store-wide ones fold behind a "Store-wide offers (N)" row. Every live
 * promotion applies to every product on an ORDER-scoped campaign, so
 * leading with those would bury the one line that is actually about the
 * item in front of the shopper. With nothing specific, the store-wide
 * list is the card and opens by default.
 *
 * Two-tier gate, fail CLOSED — plan flag AND merchant runtime setting,
 * the commercial-feature pattern. Django applies the same two tiers and
 * answers 404, so an ungated request renders nothing either way.
 */
const props = defineProps<{
  productId: number
}>()

const { t } = useStoreI18n('components/Product/Offers')
const toast = useToast()
const { copy, isSupported: clipboardSupported } = useClipboard()

const { rows, specific, storeWide, openCount } = await useProductPromotions(() => props.productId)

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
  <section
    v-if="rows.length"
    class="rounded-[1.125rem] border border-default bg-default px-4.5 py-1.5"
    :aria-label="t('title')"
  >
    <!-- The count beside the heading, not in it: the heading names the
         card, and a number run into its text read as one word. -->
    <div class="flex items-center justify-between gap-2 border-b border-default py-3">
      <h2 class="flex items-center gap-2 text-sm font-bold text-highlighted">
        <UIcon
          name="i-lucide-ticket-percent"
          class="size-4.5"
        />
        {{ t('title') }}
      </h2>
      <UBadge
        :label="String(openCount)"
        color="neutral"
        variant="soft"
      />
    </div>

    <ul
      v-if="specific.length"
      class="list-none p-0"
    >
      <ProductOfferRow
        v-for="offer in specific"
        :key="offer.id"
        :offer="offer"
        :clipboard-supported="clipboardSupported"
        @copy="copyCode"
      />
    </ul>

    <UCollapsible
      v-if="storeWide.length"
      :default-open="!specific.length"
    >
      <UButton
        color="neutral"
        variant="link"
        block
        trailing-icon="i-lucide-chevron-down"
        :class="specific.length && 'border-t border-default'"
        class="group justify-between rounded-none px-0 py-3 text-accent"
        :ui="{ trailingIcon: `
          transition-transform
          group-data-[state=open]:rotate-180
        ` }"
        :label="t('store_wide', { count: storeWide.length })"
      />

      <template #content>
        <ul class="list-none border-t border-default p-0">
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
  </section>
</template>

<i18n lang="yaml">
el:
  title: Προσφορές για αυτό το προϊόν
  store_wide: 'Προσφορές σε όλο το κατάστημα ({count})'
en:
  title: Offers for this product
  store_wide: 'Store-wide offers ({count})'
</i18n>
