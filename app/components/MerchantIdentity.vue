<script setup lang="ts">
/**
 * The seller's identity, published where the law requires it to be.
 *
 * N. 4919/2022 art. 22 §4 wants the legal form, company name, registered
 * seat and (where it applies) liquidation status "σε εμφανές σημείο" —
 * a prominent place. The footer is that place: it is on every page,
 * which is also what makes it satisfy the e-Commerce Directive's
 * "permanently accessible" test (art. 5(1)), and art. 22 §3 puts the
 * GEMI number on the e-shop.
 *
 * One line, as the footer's fine print draws it: name and seat, then
 * the register numbers. The store's phone and email are the footer's
 * own contact row, where they are links a shopper taps.
 *
 * Renders nothing at all for a store that has published none of it. A
 * line of empty separators is not more compliant than silence, and it
 * reads as a broken page to every shopper.
 */
const { t } = useI18n()
const { identity, hasIdentity, legalName, registeredSeat, inLiquidation }
  = useMerchantIdentity()

const parts = computed(() => [
  legalName.value,
  registeredSeat.value,
  identity.value?.registrationNumber ? `${t('gemi')} ${identity.value.registrationNumber}` : '',
  identity.value?.vatId ? `${t('vat_id')} ${identity.value.vatId}` : '',
].filter(Boolean))
</script>

<template>
  <address
    v-if="hasIdentity"
    class="not-italic"
  >
    <template
      v-for="(part, index) in parts"
      :key="part"
    >
      <span
        v-if="index"
        aria-hidden="true"
      > · </span><span>{{ part }}</span>
    </template>
    <!-- Disclosing liquidation is itself the art. 22 §4 obligation, so
         it must be legible rather than tucked in with the rest. -->
    <strong
      v-if="inLiquidation"
      class="flex items-center gap-1.5 font-semibold text-default"
    >
      <UIcon
        name="i-lucide-triangle-alert"
        class="size-4 shrink-0 text-warning"
        aria-hidden="true"
      />
      {{ t('in_liquidation') }}
    </strong>
  </address>
</template>

<i18n lang="yaml">
el:
  gemi: ΓΕΜΗ
  vat_id: ΑΦΜ
  in_liquidation: Υπό εκκαθάριση
en:
  gemi: GEMI
  vat_id: VAT number
  in_liquidation: In liquidation
</i18n>
