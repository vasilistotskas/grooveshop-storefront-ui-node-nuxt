<script lang="ts" setup>
/**
 * One earned free-gift entitlement, rendered as a real mini product
 * row — thumbnail, product name and a "Δωρεάν" badge — instead of
 * the promotion's internal name, so the shopper understands a
 * PRODUCT is being added to their order at no cost. The promotion
 * name is the caption (the "why").
 */
const props = defineProps<{
  gift: {
    promotionId?: number
    name?: string
    productId?: number
    productName?: string
    productImagePath?: string
    quantity?: number
  }
}>()

const { t } = useI18n()

const productLabel = computed(() =>
  props.gift.productName || props.gift.name || '')
</script>

<template>
  <!--
    ``min-w-0`` is load-bearing, not cosmetic: this row renders inside
    grid/flex parents (the cart summary is ``grid gap-4``), whose items
    default to ``min-width: auto`` and therefore refuse to shrink below
    their content's min-content width. The captions below use
    ``truncate`` (``white-space: nowrap``), so that min-content is the
    FULL untruncated string — the row measured 431px inside a 352px
    track and pushed the whole summary column into overflow, clipping
    the badge and every price (staging, 2026-08-26). ``min-w-0`` lets
    the row shrink to its track so the inner truncation can engage.
  -->
  <div
    class="
      flex w-full min-w-0 items-center gap-3 rounded-lg border
      border-success/25 bg-success/5 p-2
    "
  >
    <div
      class="
        relative size-12 shrink-0 overflow-hidden rounded-md bg-white
        dark:bg-primary-900
      "
    >
      <ImgWithFallback
        v-if="gift.productImagePath"
        loading="lazy"
        class="size-full bg-transparent object-contain"
        :width="48"
        :height="48"
        fit="contain"
        :background="'transparent'"
        :src="gift.productImagePath"
        :alt="productLabel"
        densities="x1"
      />
      <UIcon
        v-else
        name="i-heroicons-gift"
        class="absolute inset-0 m-auto size-6 text-success"
      />
    </div>
    <div class="min-w-0 flex-1">
      <p
        class="
          truncate text-sm font-semibold text-primary-950
          dark:text-primary-50
        "
      >
        {{ productLabel }}
        <span
          v-if="(gift.quantity ?? 1) > 1"
          class="font-normal text-muted"
        >×{{ gift.quantity }}</span>
      </p>
      <p class="truncate text-xs text-muted">
        {{ t('gift_reason', { name: gift.name }) }}
      </p>
    </div>
    <UBadge
      color="success"
      variant="subtle"
      size="sm"
      icon="i-heroicons-gift"
      class="shrink-0"
    >
      {{ t('free') }}
    </UBadge>
  </div>
</template>

<i18n lang="yaml">
el:
  free: Δωρεάν
  gift_reason: Δώρο από την προσφορά «{name}»
</i18n>
