<script lang="ts" setup>
/**
 * One offer inside the product page's offer panel.
 *
 * Deliberately a row, not a card: the panel sits beside the add-to-cart
 * button, so each offer gets one scannable line — the benefit, what it
 * is called, why it applies here, and how to claim it.
 */
defineProps<{
  offer: ProductPromotion
  clipboardSupported: boolean
}>()

const emit = defineEmits<{ copy: [code: string] }>()

const { t } = useI18n()
const { headline, conditions, icon, color, expiry } = usePromotionOffer()
</script>

<template>
  <li class="flex items-start gap-3 px-4 py-3">
    <UBadge
      :color="color(offer)"
      :icon="icon(offer)"
      variant="subtle"
      size="md"
      class="shrink-0 font-semibold"
    >
      {{ headline(offer) }}
    </UBadge>

    <div class="min-w-0 flex-1 space-y-1">
      <p class="text-sm leading-tight font-medium">
        {{ offer.name }}
      </p>

      <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <span>{{ t(`promotion.relation.${offer.relation}`) }}</span>
        <span
          v-if="expiry(offer.endsAt)"
          class="flex items-center gap-1 text-warning"
        >
          <UIcon name="i-heroicons-clock" class="size-3.5" />
          {{ expiry(offer.endsAt) }}
        </span>
      </p>

      <p
        v-if="conditions(offer).length"
        class="text-xs text-muted"
      >
        {{ conditions(offer).join(' · ') }}
      </p>

      <!-- An AUTOMATIC promotion has no code, and saying so beats an
           empty slot: the shopper needs to know there is nothing to
           enter. -->
      <div v-if="offer.code" class="flex items-center gap-1.5 pt-0.5">
        <code
          class="
            rounded-md border border-dashed border-default px-2 py-0.5 font-mono
            text-xs font-bold
          "
        >{{ offer.code }}</code>
        <!-- ``subtle``, not ``ghost``: an icon-only ghost button beside
             a dashed code box reads as decoration on a dark card, and
             copying the code is the whole point of showing it. -->
        <!-- ClientOnly, not just the `v-if`: `isSupported` is FALSE during
             SSR and true the moment the client evaluates it, so the button
             appeared out of nowhere during hydration and Vue reported a
             mismatch on every page carrying a coupon code. A capability
             the server cannot know is exactly what ClientOnly is for. -->
        <ClientOnly>
          <UButton
            v-if="clipboardSupported"
            color="neutral"
            variant="subtle"
            size="xs"
            icon="i-heroicons-clipboard-document"
            :aria-label="t('promotion.copy_code')"
            @click="emit('copy', offer.code!)"
          />
        </ClientOnly>
      </div>
      <p v-else class="pt-0.5 text-xs text-muted">
        {{ t('promotion.automatic') }}
      </p>
    </div>
  </li>
</template>
