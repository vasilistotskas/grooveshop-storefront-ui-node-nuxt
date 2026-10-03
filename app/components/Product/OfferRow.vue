<script lang="ts" setup>
/**
 * One offer in the product page's offer card: how it is claimed, what
 * it is called, what it gives and on what terms.
 *
 * A row, not a card: the panel sits under the buy button, so each offer
 * gets one scannable line. A coupon leads with its code, which is what
 * the shopper carries to checkout; an automatic promotion leads with its
 * name, since there is nothing to type.
 */
const props = defineProps<{
  offer: ProductPromotion
  clipboardSupported: boolean
}>()

const emit = defineEmits<{ copy: [code: string] }>()

const { t } = useI18n()
const { headline, conditions, expiry } = usePromotionOffer()

const detail = computed(() => [
  props.offer.code ? props.offer.name : headline(props.offer),
  ...conditions(props.offer),
  expiry(props.offer.endsAt),
].filter(Boolean).join(' · '))
</script>

<template>
  <li class="flex items-center gap-3 border-t border-default py-3 first:border-t-0">
    <UBadge
      v-if="offer.code"
      :label="t('code')"
      color="neutral"
      class="shrink-0 bg-volt text-on-volt"
    />
    <UBadge
      v-else
      :label="t('automatic')"
      color="success"
      variant="soft"
      class="shrink-0"
    />

    <div class="flex min-w-0 flex-1 flex-col">
      <code
        v-if="offer.code"
        class="font-mono text-[0.8125rem] font-bold text-highlighted"
      >{{ offer.code }}</code>
      <span
        v-else
        class="text-[0.8125rem] font-bold text-highlighted"
      >{{ offer.name }}</span>
      <span class="text-[0.8125rem] text-muted">{{ detail }}</span>
    </div>

    <!-- ClientOnly, not just the `v-if`: `isSupported` is FALSE during
         SSR and true the moment the client evaluates it, so the button
         appeared out of nowhere during hydration and Vue reported a
         mismatch on every page carrying a coupon code. A capability
         the server cannot know is exactly what ClientOnly is for. -->
    <ClientOnly v-if="offer.code">
      <UButton
        v-if="clipboardSupported"
        color="neutral"
        variant="ghost"
        size="sm"
        square
        icon="i-lucide-copy"
        :aria-label="t('copy', { code: offer.code })"
        @click="emit('copy', offer.code)"
      />
    </ClientOnly>
  </li>
</template>

<i18n lang="yaml">
el:
  code: Κωδικός
  automatic: Αυτόματα
  copy: Αντιγραφή του {code}
en:
  code: Code
  automatic: Auto
  copy: Copy {code}
</i18n>
