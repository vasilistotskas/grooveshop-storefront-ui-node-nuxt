<script lang="ts" setup>
/**
 * One offer on the `/offers` page, as the board draws it: the benefit
 * as a figure, whether it needs a code, what it is and on what terms,
 * the products or categories it applies to — linked, not described —
 * and the one thing a shopper does with it: take the code to checkout,
 * copied in one tap, or hear that it applies by itself.
 *
 * Only what the payload carries is drawn. A category-scoped offer links
 * to its categories; a product-scoped one shows its products as tiles
 * that open them. Nothing links to "the offer" as a destination because
 * an offer has none of its own.
 */
const emit = defineEmits<{ copy: [code: string] }>()

const props = defineProps<{
  offer: PublicPromotion
  clipboardSupported: boolean
}>()

const { t } = useI18n()
const localePath = useLocalePath()
const { headline, figure, conditions, expiry } = usePromotionOffer()

// A card is one column of a three-up grid, so it shows a handful of
// tiles and counts the rest. The serializer already caps its preview.
const ELIGIBLE_PREVIEW = 3
const visibleEligibleProducts = computed(
  () => props.offer.eligibleProducts.slice(0, ELIGIBLE_PREVIEW),
)
const hiddenEligibleCount = computed(
  () => props.offer.eligibleProductCount - visibleEligibleProducts.value.length,
)

const isCode = computed(() => props.offer.trigger === 'CODE')
</script>

<template>
  <article
    class="
      flex flex-col gap-4 rounded-[1.25rem] bg-default p-5 ring ring-default
      sm:p-6
    "
  >
    <div class="flex items-start justify-between gap-3">
      <!-- The figure where the benefit is a number; the headline's
           words where it is not ("Δωρεάν αποστολή"), a size down. The
           accent as TEXT is `text-accent`: the semantic colours are
           fills, not copy. -->
      <p
        class="font-display font-bold text-accent"
        :class="figure(offer) ? 'text-[3rem]/none' : 'text-[2rem]/[1.05]'"
      >
        {{ figure(offer) ?? headline(offer) }}
      </p>

      <UBadge
        :color="isCode ? 'neutral' : 'success'"
        variant="soft"
        size="sm"
        class="shrink-0 font-semibold"
        :class="isCode ? 'bg-volt text-on-volt' : ''"
      >
        {{ isCode ? t('tag.code') : t('tag.automatic') }}
      </UBadge>
    </div>

    <div class="flex flex-col gap-1">
      <h2 class="text-lg/tight font-bold text-highlighted">
        {{ offer.name }}
      </h2>
      <p
        v-if="offer.description"
        class="text-sm text-toned"
      >
        {{ offer.description }}
      </p>
    </div>

    <ul
      v-if="conditions(offer).length"
      class="m-0 flex list-none flex-wrap gap-1.5 p-0"
    >
      <li
        v-for="condition in conditions(offer)"
        :key="condition"
        class="rounded-full bg-elevated px-2.5 py-1 text-xs text-toned"
      >
        {{ condition }}
      </li>
    </ul>

    <!-- The gift or the discounted units, named: the shopper should
         read what they get. -->
    <div
      v-if="offer.rewardProducts.length"
      class="flex flex-col gap-1.5"
    >
      <p class="text-xs font-medium text-toned">
        {{ t('reward') }}
      </p>
      <div class="flex flex-wrap gap-3">
        <OffersProductChip
          v-for="product in offer.rewardProducts"
          :key="product.id"
          :product="product"
          named
        />
      </div>
    </div>

    <!-- What the offer applies to, as tiles that open each product. The
         rest is a count against the TOTAL, not the serializer's capped
         preview, so "+12 more" stays true on a catalogue-wide campaign. -->
    <div
      v-if="offer.eligibleProducts.length"
      class="flex flex-wrap items-center gap-2"
    >
      <OffersProductChip
        v-for="product in visibleEligibleProducts"
        :key="product.id"
        :product="product"
      />
      <span
        v-if="hiddenEligibleCount > 0"
        class="text-xs text-toned"
      >
        {{ t('more_products', { count: hiddenEligibleCount }) }}
      </span>
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
        trailing-icon="i-lucide-arrow-right"
        :to="localePath({
          name: 'products-category-id-slug',
          params: { id: category.id, slug: category.slug },
        })"
        :label="category.name"
      />
    </div>

    <!-- The coupon's tear line, pinned to the bottom so cards of
         different heights line it up: what you take to checkout. An
         AUTOMATIC offer has no code, and saying so beats an empty slot. -->
    <div class="mt-auto flex flex-col gap-3">
      <div
        class="
          flex min-h-13 items-center justify-between gap-3 rounded-[0.875rem]
          border-[1.5px] border-dashed border-accented py-2 ps-4 pe-2
        "
      >
        <template v-if="offer.code">
          <span class="sr-only">{{ t('promotion.code_label') }}</span>
          <code class="truncate font-mono font-bold tracking-[0.06em] text-highlighted">{{ offer.code }}</code>
          <!-- ClientOnly: `isSupported` is false during SSR and true on
               the client, so the button would appear mid-hydration and
               Vue would report a mismatch. -->
          <ClientOnly>
            <UButton
              v-if="clipboardSupported"
              color="neutral"
              size="sm"
              icon="i-lucide-copy"
              :label="t('copy')"
              :aria-label="t('promotion.copy_code')"
              class="shrink-0"
              @click="() => emit('copy', offer.code!)"
            />
          </ClientOnly>
        </template>
        <p
          v-else
          class="flex items-center gap-2 text-sm font-semibold text-highlighted"
        >
          <UIcon
            name="i-lucide-sparkles"
            class="size-4 shrink-0"
            aria-hidden="true"
          />
          {{ t('promotion.automatic') }}
        </p>
      </div>

      <!-- Urgency, not trivia: "Λήγει σε 3 ημέρες" is a reason to act
           where a bare date is something to ignore. -->
      <p class="flex items-center gap-1.5 text-xs text-toned">
        <UIcon
          name="i-lucide-clock"
          class="size-3.5"
          aria-hidden="true"
        />
        {{ expiry(offer.endsAt) ?? t('no_expiry') }}
      </p>
    </div>
  </article>
</template>

<i18n lang="yaml">
el:
  tag:
    code: Με κωδικό
    automatic: Αυτόματη
  reward: Παίρνεις
  copy: Αντιγραφή
  more_products: '+{count} ακόμη'
  no_expiry: Χωρίς λήξη
en:
  tag:
    code: With code
    automatic: Automatic
  reward: You get
  copy: Copy
  more_products: '+{count} more'
  no_expiry: No expiry
</i18n>
