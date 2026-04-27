<script lang="ts" setup>
const cartStore = useCartStore()
const localePath = useLocalePath()
const {
  cart,
  pending,
  hasStockIssues,
} = storeToRefs(cartStore)
const { t } = useI18n()
const { $i18n } = useNuxtApp()
const { hasStockIssue, getStockStatusMessage } = cartStore

// The abandoned-cart recovery route forwards here with ``?recovered=1``.
// We surface a one-shot welcome banner so the shopper sees affirmation
// that their cart was preserved (stock reservations are NOT restored —
// items may have sold out in the interim, which the existing
// ``hasStockIssues`` alert below will flag naturally).
//
// Only render once the cart has loaded AND has at least one item —
// otherwise the "we kept your cart" copy is actively misleading for
// shoppers whose cart was emptied between email send and click. Once
// shown, we strip the ``recovered`` query param from the URL so a
// subsequent back-nav or reload doesn't re-trigger the banner.
const route = useRoute()
const router = useRouter()
const wasRecovered = ref(route.query.recovered === '1')
const showRecoveredBanner = computed(() =>
  wasRecovered.value
  && !pending.value
  && (cart.value?.items?.length ?? 0) > 0,
)

watch(showRecoveredBanner, (isShown) => {
  if (!isShown) return
  // Fire-and-forget: removing the query param is a nice-to-have for
  // back-nav; blocking the banner render on it would be a regression.
  router.replace({ query: { ...route.query, recovered: undefined } })
    .catch(() => {})
})

const breadcrumb = computed(() => [
  {
    label: t('home'),
    to: localePath('index'),
    icon: 'i-heroicons-home',
  },
  {
    label: t('shopping_cart'),
    to: localePath('cart'),
    icon: 'i-heroicons-shopping-cart',
  },
])

const cardConfig = {
  color: 'primary' as const,
  variant: 'outline' as const,
}

const mainCardUI = (cartItem?: CartItem) => ({
  root: `w-full p-4 ${cartItem && hasStockIssue(cartItem) ? 'bg-primary-50 dark:bg-primary-900' : ''}`,
  body: 'p-0 sm:p-0',
})

const summaryCardUI = {
  root: 'p-6',
}

// Without a page-level title, setupPageHeader() falls back to the
// raw appTitle, which the siteName template then pads with
// " - <siteName>" on top, producing a duplicated brand suffix.
// Set a proper cart title so the document title reads
// "Καλάθι Αγορών - <siteName>".
useSeoMeta({
  title: () => t('shopping_cart'),
})

defineRouteRules({
  robots: false,
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="max-w-(--container-6xl)">
    <UBreadcrumb
      :items="breadcrumb"
      divider="chevron"
      class="mb-8"
    />

    <UAlert
      v-if="showRecoveredBanner"
      color="info"
      variant="soft"
      icon="i-heroicons-shopping-cart"
      :title="t('recovered.title')"
      :description="t('recovered.description')"
      :close="true"
      class="mb-6"
      @update:open="(open: boolean) => !open && (wasRecovered = false)"
    />

    <UAlert
      v-if="!pending && hasStockIssues"
      color="warning"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      class="mb-6"
    >
      <template #title>
        {{ t('stock_alert.title') }}
      </template>
    </UAlert>

    <div
      class="
        relative flex w-full flex-col gap-4
        lg:flex-row lg:gap-8
      "
    >
      <div class="grid w-full content-start gap-6">
        <div
          class="
            flex flex-col gap-2
            sm:flex-row sm:items-center sm:justify-between
          "
        >
          <h1 class="text-2xl font-bold">
            {{ t('shopping_cart') }}
          </h1>
          <p
            v-if="!pending && cart?.totalItems"
            class="text-gray-500"
          >
            {{ t('items_in_cart', { count: cart.totalItems }) }}
          </p>
          <USkeleton
            v-else
            class="h-6 w-24"
          />
        </div>

        <div
          v-if="!pending && cart?.items?.length"
          class="flex w-full flex-col gap-4"
        >
          <UCard
            v-for="cartItem in cart.items"
            :key="cartItem.id"
            v-bind="cardConfig"
            :ui="mainCardUI(cartItem)"
          >
            <UAlert
              v-if="getStockStatusMessage(cartItem)"
              :color="getStockStatusMessage(cartItem)?.severity === 'error' ? 'error' : 'warning'"
              variant="soft"
              :icon="getStockStatusMessage(cartItem)?.severity === 'error' ? 'i-heroicons-x-circle' : 'i-heroicons-exclamation-triangle'"
              class="mb-4"
            >
              <template #title>
                {{ getStockStatusMessage(cartItem)?.severity === 'error' ? t('stock_status.unavailable_title') : t('stock_status.limited_title') }}
              </template>
              <template #description>
                <div v-if="getStockStatusMessage(cartItem)?.type === 'limited_stock'">
                  {{ t('stock_status.limited_stock', {
                    available: getStockStatusMessage(cartItem)?.available,
                    requested: getStockStatusMessage(cartItem)?.requested,
                  }) }}
                </div>
                <div v-else>
                  {{ t('stock_status.out_of_stock') }}
                </div>
              </template>
            </UAlert>

            <CartItemCard :cart-item="cartItem" />
          </UCard>
        </div>

        <LazyEmptyState
          v-else-if="!pending && !cart?.items?.length"
          class="w-full"
          :title="t('empty.title')"
          :description="t('empty.description_long')"
        >
          <template #icon>
            <UIcon
              name="i-heroicons-shopping-cart"
              size="xl"
            />
          </template>
          <template #actions>
            <UButton
              :to="localePath('index')"
              color="secondary"
              variant="solid"
              size="lg"
              icon="i-heroicons-arrow-right"
              trailing
            >
              {{ t('empty.description') }}
            </UButton>
          </template>
        </LazyEmptyState>

        <div
          v-else
          class="flex w-full flex-col gap-4"
        >
          <UCard
            v-for="index in (cart?.items?.length || 2)"
            :key="index"
            v-bind="cardConfig"
            :ui="mainCardUI()"
          >
            <div
              class="
                flex flex-col gap-4
                sm:flex-row sm:gap-6
              "
            >
              <USkeleton
                class="
                  h-24 w-full flex-shrink-0 rounded-lg
                  sm:w-24
                "
              />

              <div class="flex-1">
                <div
                  class="
                    flex flex-col gap-4
                    sm:flex-row sm:justify-between sm:gap-0
                  "
                >
                  <div class="space-y-2">
                    <USkeleton class="h-5 w-48" />
                    <USkeleton class="h-4 w-32" />
                  </div>
                  <USkeleton class="h-8 w-8" />
                </div>
                <div
                  class="
                    mt-4 flex flex-col gap-4
                    sm:flex-row sm:justify-between sm:gap-0
                  "
                >
                  <USkeleton class="h-8 w-32" />
                  <USkeleton class="h-5 w-24" />
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <div
        v-if="!pending && cart?.items?.length"
        class="
          w-full
          lg:max-w-md
        "
      >
        <UCard
          v-bind="cardConfig"
          :ui="summaryCardUI"
        >
          <template #header>
            <h2 class="text-xl font-semibold">
              {{ t('order_summary') }}
            </h2>
          </template>

          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            class="grid gap-4"
          >
            <div class="flex justify-between">
              <span>{{ t('subtotal', cart.totalItems) }}</span>
              <span>{{ $i18n.n(cart.totalPrice - cart.totalVatValue, 'currency') }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ t('vat') }}</span>
              <span>{{ $i18n.n(cart.totalVatValue, 'currency') }}</span>
            </div>
            <div
              v-if="cart.totalDiscountValue > 0"
              class="flex justify-between text-green-600"
            >
              <span>{{ t('discount') }}</span>
              <span>-{{ $i18n.n(cart.totalDiscountValue, 'currency') }}</span>
            </div>
            <USeparator />
            <div class="flex justify-between text-lg font-semibold">
              <span>{{ t('total') }}</span>
              <span>{{ $i18n.n(cart.totalPrice, 'currency') }}</span>
            </div>
          </div>

          <template #footer>
            <UButton
              :to="localePath('checkout')"
              :disabled="hasStockIssues"
              :color="hasStockIssues ? 'warning' : 'success'"
              variant="subtle"
              size="xl"
              block
            >
              {{ hasStockIssues ? t('fix_stock_issues_first') : t('proceed_to_checkout') }}
            </UButton>
          </template>
        </UCard>
      </div>
      <div
        v-else
        class="
          w-full
          lg:max-w-md
        "
      >
        <UCard
          v-bind="cardConfig"
          :ui="summaryCardUI"
        >
          <template #header>
            <USkeleton class="h-7 w-40" />
          </template>

          <div class="grid gap-4">
            <div class="flex justify-between">
              <USkeleton class="h-5 w-20" />
              <USkeleton class="h-5 w-24" />
            </div>
            <div class="flex justify-between">
              <USkeleton class="h-5 w-16" />
              <USkeleton class="h-5 w-24" />
            </div>
            <USeparator />
            <div class="flex justify-between">
              <USkeleton class="h-6 w-16" />
              <USkeleton class="h-6 w-28" />
            </div>
          </div>

          <template #footer>
            <USkeleton class="h-11 w-full" />
          </template>
        </UCard>
      </div>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  home: Αρχική
  shopping_cart: Καλάθι Αγορών
  items_in_cart: "{count} προϊόντα"
  empty:
    title: Το καλάθι σου είναι άδειο
    description: Συνέχεια
    description_long: Δεν έχεις προσθέσει ακόμα προϊόντα στο καλάθι σου
  order_summary: Σύνοψη Παραγγελίας
  subtotal: Κόστος Προϊόντος | Κόστος Προϊόντων
  vat: ΦΠΑ
  discount: Έκπτωση
  total: Σύνολο
  proceed_to_checkout: Ολοκλήρωση Παραγγελίας
  fix_stock_issues_first: Διόρθωσε τα προβλήματα
  stock_status:
    out_of_stock: Το προϊόν δεν είναι διαθέσιμο
    limited_stock: "Διαθέσιμα μόνο {available} τεμάχια (έχετε {requested} στο καλάθι)"
    unavailable_title: Μη Διαθέσιμο
    limited_title: Περιορισμένη Διαθεσιμότητα
  stock_alert:
    title: Προβλήματα Διαθεσιμότητας
    description: Κάποια προϊόντα στο καλάθι σου δεν είναι διαθέσιμα στην επιθυμητή ποσότητα.
    fix_button: Αυτόματη Διόρθωση
  stock_fix:
    success_title: Το καλάθι ενημερώθηκε
    success_description: Οι ποσότητες προσαρμόστηκαν στη διαθέσιμη προϊόντα.
  recovered:
    title: Καλωσόρισες πίσω!
    description: Κρατήσαμε το καλάθι σου. Έλεγξε τα προϊόντα πριν κάποια εξαντληθούν.
</i18n>
