<script lang="ts" setup>
/**
 * Public offers page.
 *
 * The store's promotion engine is fully functional but was invisible:
 * automatic promotions only reveal themselves once the cart already
 * qualifies, so a shopper could never learn that spending 80€ earns a
 * gift, or that a 2+1 is running, before building the cart. This page
 * is the discovery half.
 *
 * Gated by the `promotions-enabled` middleware (tenant plan flag AND
 * merchant runtime setting, both fail-closed). Django applies the same
 * two tiers to the endpoint, so an ungated request still gets nothing.
 */
const { t } = useI18n()
const { $i18n } = useNuxtApp()
const localePath = useLocalePath()

definePageMeta({
  middleware: ['promotions-enabled'],
})

useSeoMeta({
  title: () => t('title'),
  description: () => t('description'),
})

const { data: offers } = await useFetch('/api/promotions', {
  key: 'public-offers',
  headers: useRequestHeaders(),
  default: () => [],
})

const rows = computed(() => offers.value ?? [])

/** The headline claim on the card, per benefit type. */
function headline(offer: PublicPromotion): string {
  switch (offer.benefitType) {
    case 'PERCENTAGE':
      return t('benefit.percentage', { value: Number(offer.benefitValue) })
    case 'FIXED_AMOUNT':
      return t('benefit.fixed', {
        amount: $i18n.n(Number(offer.benefitValue), 'currency'),
      })
    case 'FREE_SHIPPING':
      return t('benefit.free_shipping')
    case 'BXGY':
      // getDiscountPercent of 100 is the ordinary "buy X get Y free";
      // anything less is a partial markdown on the reward units.
      return Number(offer.getDiscountPercent) >= 100
        ? t('benefit.bxgy_free', {
            buy: offer.buyQuantity ?? 1,
            get: offer.getQuantity ?? 1,
          })
        : t('benefit.bxgy_discounted', {
            buy: offer.buyQuantity ?? 1,
            get: offer.getQuantity ?? 1,
            value: Number(offer.getDiscountPercent),
          })
    case 'FREE_GIFT':
      return t('benefit.free_gift')
    default:
      return offer.name
  }
}

/**
 * The fine print, in the order a shopper cares about it. Built as a
 * list rather than a sentence so a card with one condition does not
 * render a paragraph.
 */
function conditions(offer: PublicPromotion): string[] {
  const out: string[] = []
  if (offer.minSubtotal !== null && Number(offer.minSubtotal) > 0) {
    out.push(t('condition.min_subtotal', {
      amount: $i18n.n(Number(offer.minSubtotal), 'currency'),
    }))
  }
  if (offer.minQuantity !== null && Number(offer.minQuantity) > 1) {
    out.push(t('condition.min_quantity', { count: offer.minQuantity }))
  }
  if (offer.maxDiscountAmount !== null && Number(offer.maxDiscountAmount) > 0) {
    out.push(t('condition.max_discount', {
      amount: $i18n.n(Number(offer.maxDiscountAmount), 'currency'),
    }))
  }
  if (offer.firstOrderOnly) out.push(t('condition.first_order'))
  if (offer.excludeDiscountedProducts) out.push(t('condition.no_sale_items'))
  if (!offer.stackable) out.push(t('condition.not_stackable'))
  return out
}

const badgeColor = (offer: PublicPromotion) =>
  offer.benefitType === 'FREE_GIFT'
    ? 'secondary'
    : offer.benefitType === 'FREE_SHIPPING'
      ? 'success'
      : 'primary'
</script>

<template>
  <PageWrapper class="flex flex-col gap-6">
    <PageTitle :text="t('title')" />
    <p class="mb-6 max-w-prose text-muted">
      {{ t('description') }}
    </p>

    <div
      v-if="rows.length === 0"
      class="rounded-lg border border-default p-8 text-center"
    >
      <UIcon
        name="i-heroicons-tag"
        class="mx-auto mb-3 size-10 text-muted"
      />
      <p class="font-medium">
        {{ t('empty.title') }}
      </p>
      <p class="mt-1 text-sm text-muted">
        {{ t('empty.description') }}
      </p>
      <UButton
        class="mt-4"
        :to="localePath('products')"
        :label="t('empty.cta')"
        color="primary"
      />
    </div>

    <ul
      v-else
      class="
        grid list-none grid-cols-1 gap-4 p-0
        md:grid-cols-2
        xl:grid-cols-3
      "
    >
      <li
        v-for="offer in rows"
        :key="offer.id"
        class="
          flex flex-col gap-3 rounded-lg border border-default bg-elevated/40
          p-5
        "
      >
        <div class="flex items-start justify-between gap-3">
          <UBadge
            :color="badgeColor(offer)"
            variant="subtle"
            size="lg"
          >
            {{ headline(offer) }}
          </UBadge>
          <NuxtTime
            v-if="offer.endsAt"
            :datetime="offer.endsAt"
            day="numeric"
            month="short"
            class="shrink-0 text-xs text-muted"
          />
        </div>

        <h2 class="text-lg leading-tight font-bold">
          {{ offer.name }}
        </h2>
        <p
          v-if="offer.description"
          class="text-sm text-muted"
        >
          {{ offer.description }}
        </p>

        <!-- The gift or the discounted units: leading with the actual
             product makes the offer concrete rather than a slogan. -->
        <div
          v-if="offer.rewardProducts.length"
          class="flex flex-wrap gap-3"
        >
          <NuxtLink
            v-for="product in offer.rewardProducts"
            :key="product.id"
            :to="localePath({
              name: 'products-id-slug',
              params: { id: product.id, slug: product.slug },
            })"
            class="
              flex items-center gap-2 rounded-md bg-default p-2 text-sm
              hover:underline
            "
          >
            <ImgWithFallback
              :src="product.mainImagePath"
              :alt="product.name"
              :width="40"
              :height="40"
              fit="contain"
              background="transparent"
              class="size-10 shrink-0 object-contain"
            />
            <span class="line-clamp-2">{{ product.name }}</span>
          </NuxtLink>
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

        <!-- An AUTOMATIC promotion has no code: saying so is better
             than an empty slot, because the shopper needs to know
             there is nothing to enter. -->
        <div class="mt-auto pt-1">
          <div
            v-if="offer.code"
            class="flex items-center gap-2"
          >
            <span class="text-xs text-muted">{{ t('code_label') }}</span>
            <code
              class="
                rounded-md border border-dashed border-default px-2 py-1
                font-mono text-sm font-bold
              "
            >{{ offer.code }}</code>
          </div>
          <p
            v-else
            class="text-xs text-muted"
          >
            {{ t('automatic') }}
          </p>
        </div>
      </li>
    </ul>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Προσφορές
  description: Όλες οι ενεργές προσφορές του καταστήματος, σε ένα σημείο.
  code_label: Κωδικός
  automatic: Εφαρμόζεται αυτόματα στο καλάθι
  benefit:
    percentage: -{value}%
    fixed: -{amount}
    free_shipping: Δωρεάν αποστολή
    bxgy_free: '{buy}+{get} δώρο'
    bxgy_discounted: '{buy}+{get} με -{value}%'
    free_gift: Δώρο
  condition:
    min_subtotal: Για αγορές από {amount}
    min_quantity: Για {count} τεμάχια ή περισσότερα
    max_discount: Μέγιστη έκπτωση {amount}
    first_order: Μόνο για την πρώτη σου παραγγελία
    no_sale_items: Δεν ισχύει σε προϊόντα που είναι ήδη σε έκπτωση
    not_stackable: Δεν συνδυάζεται με άλλες προσφορές
  empty:
    title: Δεν υπάρχουν ενεργές προσφορές
    description: Έλεγξε ξανά σύντομα — προσθέτουμε νέες προσφορές τακτικά.
    cta: Δες τα προϊόντα
</i18n>
