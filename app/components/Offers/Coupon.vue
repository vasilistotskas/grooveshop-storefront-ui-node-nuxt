<script lang="ts" setup>
/**
 * One offer as a coupon, on the homepage's ink offers band.
 *
 * Three things, loudest first: what you save (the figure, in the
 * store's highlight), what it is and on what terms, and the code to
 * take to checkout — copied in one tap. The full card with the products
 * an offer applies to is `/offers`' (`Offers/Card.vue`); this one is
 * the teaser that sends a shopper there or straight to the basket.
 *
 * Drawn for the INVERTED surface only, in that surface's own tokens, so
 * it holds in dark mode, where the surface is light.
 */
const emit = defineEmits<{ copy: [code: string] }>()

defineProps<{
  offer: PublicPromotion
  clipboardSupported: boolean
}>()

const { t } = useI18n()
const { headline, figure, conditions } = usePromotionOffer()
</script>

<template>
  <article
    class="
      flex flex-col gap-4 rounded-[1.375rem] border border-(--ui-text-inverted)/15
      bg-(--ui-text-inverted)/5 p-6
    "
  >
    <!-- A figure where the benefit is a number; the headline's words
         where it is not ("Δωρεάν αποστολή"), a size down so they fit. -->
    <p
      class="font-display font-bold text-(--ui-volt-on-inverted)"
      :class="figure(offer) ? 'text-[3.5rem]/none' : 'text-[2rem]/[1.05]'"
    >
      {{ figure(offer) ?? headline(offer) }}
    </p>

    <div class="flex flex-col gap-1">
      <h3 class="text-[1.0625rem] font-bold text-inverted">
        {{ offer.name }}
      </h3>
      <p
        v-if="conditions(offer).length"
        class="text-sm text-inverted/65"
      >
        {{ conditions(offer).join(' · ') }}
      </p>
    </div>

    <!-- The coupon's tear line: what you take to checkout. An AUTOMATIC
         promotion has no code, and saying so beats an empty slot. The
         row keeps the button's height whether or not the button is
         there, so it does not grow when the client adds it. -->
    <div
      class="
        mt-auto flex min-h-13 items-center justify-between gap-3 rounded-[0.875rem]
        border-[1.5px] border-dashed border-(--ui-text-inverted)/30 py-2 ps-4 pe-2
      "
    >
      <template v-if="offer.code">
        <span class="sr-only">{{ t('promotion.code_label') }}</span>
        <code class="truncate font-mono font-bold tracking-[0.06em] text-inverted">{{ offer.code }}</code>
        <!-- ClientOnly: `isSupported` is false during SSR and true on
             the client, so the button would appear mid-hydration and Vue
             would report a mismatch. -->
        <ClientOnly>
          <UButton
            v-if="clipboardSupported"
            color="neutral"
            size="sm"
            icon="i-heroicons-document-duplicate"
            :label="t('copy')"
            :aria-label="t('promotion.copy_code')"
            class="
              shrink-0 bg-default text-highlighted
              hover:bg-default/90
              active:bg-default/90
            "
            @click="() => emit('copy', offer.code!)"
          />
        </ClientOnly>
      </template>
      <p
        v-else
        class="flex items-center gap-2 text-sm font-semibold text-inverted"
      >
        <UIcon
          name="i-heroicons-sparkles"
          class="size-4 shrink-0"
        />
        {{ t('promotion.automatic') }}
      </p>
    </div>
  </article>
</template>

<i18n lang="yaml">
el:
  copy: Αντιγραφή
en:
  copy: Copy
</i18n>
