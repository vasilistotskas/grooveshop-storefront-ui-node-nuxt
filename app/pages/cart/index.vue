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

const emptyCardUI = {
  root: 'w-full p-8',
}

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
            v-for="(cartItem, index) in cart.items"
            :key="index"
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

        <UCard
          v-else-if="!pending && !cart?.items?.length"
          v-bind="cardConfig"
          :ui="emptyCardUI"
          class="text-center"
        >
          <UIcon
            name="i-heroicons-shopping-cart"
            class="mx-auto h-16 w-16 text-gray-400"
          />
          <div class="mt-4">
            <h3 class="text-lg font-semibold">
              {{ t('empty.title') }}
            </h3>
            <p class="mt-1 text-sm text-gray-500">
              {{ t('empty.description_long') }}
            </p>
          </div>
          <UButton
            :to="localePath('index')"
            color="neutral"
            variant="solid"
            size="lg"
            class="mt-4"
          >
            {{ t('empty.description') }}
          </UButton>
        </UCard>

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

          <div class="grid gap-4">
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
</i18n>
