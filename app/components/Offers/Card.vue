<script lang="ts" setup>
/**
 * One offer on the `/offers` page.
 *
 * Built around the one thing a shopper does with an offer: claim it.
 * The benefit is the loudest element, the code is copyable in one tap
 * (selecting a `<code>` by hand on a phone was the previous flow), and
 * the products or category it applies to are linked rather than
 * described — `eligibleProducts` and `eligibleCategories` are in the
 * payload precisely so the card can be concrete instead of a slogan.
 */
const emit = defineEmits<{ copy: [code: string] }>()

const props = defineProps<{
  offer: PublicPromotion
  clipboardSupported: boolean
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const { headline, conditions, icon, color, expiry } = usePromotionOffer()

// A card is one column of a three-up grid, so it shows a handful and
// counts the rest. The serializer already caps its preview at 12.
const ELIGIBLE_PREVIEW = 3
const visibleEligibleProducts = computed(
  () => props.offer.eligibleProducts.slice(0, ELIGIBLE_PREVIEW),
)
const hiddenEligibleCount = computed(
  () => props.offer.eligibleProductCount - visibleEligibleProducts.value.length,
)
</script>

<template>
  <article
    class="
      flex flex-col gap-3 overflow-hidden rounded-xl border border-default
      bg-elevated/40 p-5
    "
  >
    <div class="flex items-start justify-between gap-3">
      <!-- The TINT and the RING carry the colour; the text does not.
           Nuxt UI's `subtle` variant paints the text in the benefit
           colour too, and that colour is a fill: success-500 on a
           success/10 tint measured 3.08:1 in light mode and the accent
           4.18:1 in dark, on the first thing read on the card.
           `base`, not `label` — with no icon the default slot renders
           straight into the root and a `label` override paints nothing,
           which is how the first attempt at this changed the measured
           ratio by zero. -->
      <UBadge
        :color="color(offer)"
        :icon="icon(offer)"
        variant="subtle"
        size="lg"
        class="font-bold"
      >
        {{ headline(offer) }}
      </UBadge>

      <!-- A status colour is an ICON here, never the text. The
           semantic tokens are calibrated as FILLS: amber-500 as body
           copy on `bg-default` is 2.81:1 and green-500 is 3.08:1, both
           well under AA. -->
      <!-- Urgency, not trivia: "Λήγει σε 3 ημέρες" is a reason to act
           where a bare date is something to ignore. -->
      <span
        v-if="expiry(offer.endsAt)"
        class="flex shrink-0 items-center gap-1 text-xs font-medium text-toned"
      >
        <UIcon name="i-heroicons-clock" class="size-3.5 text-warning" />
        {{ expiry(offer.endsAt) }}
      </span>
    </div>

    <div class="space-y-1">
      <h2 class="text-lg leading-tight font-bold">
        {{ offer.name }}
      </h2>
      <p
        v-if="offer.description"
        class="text-sm text-muted"
      >
        {{ offer.description }}
      </p>
    </div>

    <!-- The gift or the discounted units: leading with the actual
         product makes the offer concrete rather than a slogan. -->
    <div
      v-if="offer.rewardProducts.length"
      class="space-y-1.5"
    >
      <p class="text-xs font-medium text-muted">
        {{ t('reward') }}
      </p>
      <div class="flex flex-wrap gap-2">
        <OffersProductChip
          v-for="product in offer.rewardProducts"
          :key="product.id"
          :product="product"
        />
      </div>
    </div>

    <!-- What the offer applies to. Named, not just pictured: a card in
         a three-up grid has room for a few, and the rest becomes a
         count rather than a wall of thumbnails. -->
    <div
      v-if="offer.eligibleProducts.length"
      class="space-y-1.5"
    >
      <p class="text-xs font-medium text-muted">
        {{ t('applies_to') }}
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <OffersProductChip
          v-for="product in visibleEligibleProducts"
          :key="product.id"
          :product="product"
        />
        <!-- Counted against the TOTAL, not the serializer's capped
             preview, so "+12 ακόμη" stays true on a catalogue-wide
             campaign. -->
        <span
          v-if="hiddenEligibleCount > 0"
          class="text-xs text-muted"
        >
          {{ t('more_products', { count: hiddenEligibleCount }) }}
        </span>
      </div>
    </div>

    <div
      v-if="offer.eligibleCategories.length"
      class="flex flex-wrap gap-2"
    >
      <UButton
        v-for="category in offer.eligibleCategories"
        :key="category.id"
        size="xs"
        variant="soft"
        color="neutral"
        trailing-icon="i-heroicons-arrow-right"
        :to="localePath({
          name: 'products-category-id-slug',
          params: { id: category.id, slug: category.slug },
        })"
        :label="category.name"
      />
    </div>

    <ul
      v-if="conditions(offer).length"
      class="list-none space-y-1 p-0 text-xs text-muted"
    >
      <li
        v-for="condition in conditions(offer)"
        :key="condition"
        class="flex items-start gap-1.5"
      >
        <UIcon
          name="i-heroicons-information-circle"
          class="mt-0.5 size-3.5 shrink-0"
        />
        <span>{{ condition }}</span>
      </li>
    </ul>

    <!-- Claim row, pinned to the bottom so cards of different heights
         line their call-to-action up. An AUTOMATIC promotion has no
         code: saying so beats an empty slot, because the shopper needs
         to know there is nothing to enter. -->
    <div class="mt-auto border-t border-default pt-3">
      <div
        v-if="offer.code"
        class="flex items-center justify-between gap-2"
      >
        <div class="flex min-w-0 items-center gap-2">
          <span class="shrink-0 text-xs text-muted">
            {{ t('promotion.code_label') }}
          </span>
          <code
            class="
              truncate rounded-md border border-dashed border-default px-2 py-1
              font-mono text-sm font-bold
            "
          >{{ offer.code }}</code>
        </div>
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
            :label="t('promotion.copy_code')"
            class="shrink-0"
            @click="emit('copy', offer.code!)"
          />
        </ClientOnly>
      </div>
      <p
        v-else
        class="flex items-center gap-1.5 text-xs text-toned"
      >
        <UIcon
          name="i-heroicons-sparkles"
          class="size-3.5 shrink-0 text-success"
        />
        {{ t('promotion.automatic') }}
      </p>
    </div>
  </article>
</template>

<i18n lang="yaml">
el:
  reward: Παίρνεις
  applies_to: Ισχύει σε
  more_products: '+{count} ακόμη'
en:
  reward: You get
  applies_to: Applies to
  more_products: '+{count} more'
</i18n>
