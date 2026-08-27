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
 * Renders nothing at all for a store that has published none of it. A
 * heading over empty rows is not more compliant than silence, and it
 * reads as a broken page to every shopper.
 */
const { t } = useI18n()
const { identity, hasIdentity, legalName, registeredSeat, inLiquidation }
  = useMerchantIdentity()
</script>

<template>
  <address
    v-if="hasIdentity"
    class="
      flex flex-col gap-0.5 text-xs not-italic text-primary-700
      dark:text-primary-300
    "
  >
    <span class="font-medium">{{ legalName }}</span>

    <span v-if="registeredSeat">{{ registeredSeat }}</span>

    <span class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span v-if="identity?.registrationNumber">
        {{ t('gemi') }}: {{ identity.registrationNumber }}
      </span>
      <span v-if="identity?.vatId">
        {{ t('vat_id') }}: {{ identity.vatId }}
      </span>
      <span v-if="identity?.phone">
        <a :href="`tel:${identity.phone}`" class="hover:underline">
          {{ identity.phone }}
        </a>
      </span>
      <span v-if="identity?.email">
        <a :href="`mailto:${identity.email}`" class="hover:underline">
          {{ identity.email }}
        </a>
      </span>
    </span>

    <!-- Disclosing liquidation is itself the art. 22 §4 obligation, so
         it must be legible rather than tucked in with the rest. -->
    <span
      v-if="inLiquidation"
      class="font-semibold text-warning-600 dark:text-warning-400"
    >
      {{ t('in_liquidation') }}
    </span>
  </address>
</template>

<i18n lang="yaml">
el:
  gemi: ΓΕΜΗ
  vat_id: ΑΦΜ
  in_liquidation: Υπό εκκαθάριση
</i18n>
