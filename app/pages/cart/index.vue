<script lang="ts" setup>
const cartStore = useCartStore()
const localePath = useLocalePath()
const { cart, pending } = storeToRefs(cartStore)
const { t } = useI18n()
const { $i18n } = useNuxtApp()

definePageMeta({
  layout: 'default',
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

const mainCardUI = {
  root: 'w-full p-4',
}

const summaryCardUI = {
  root: 'p-6',
}

const emptyCardUI = {
  root: 'w-full p-8',
}
</script>

<template>
  <PageWrapper class="max-w-(--container-6xl)">
    <UBreadcrumb
      :items="breadcrumb"
      divider="chevron"
      class="mb-8"
    />

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
            :ui="mainCardUI"
          >
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
              {{ $i18n.t('empty.title') }}
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
            {{ $i18n.t('empty.description') }}
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
            :ui="mainCardUI"
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
              <span>{{ t('subtotal') }}</span>
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
            <div class="flex justify-between font-semibold">
              <span>{{ t('total') }}</span>
              <span>{{ $i18n.n(cart.totalPrice, 'currency') }}</span>
            </div>
          </div>

          <template #footer>
            <UButton
              :to="localePath('checkout')"
              color="success"
              variant="solid"
              size="xl"
              block
            >
              {{ t('proceed_to_checkout') }}
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
  currency: €
  empty:
    title: Το καλάθι σου είναι άδειο
    description: Συνέχεια
    description_long: Δεν έχεις προσθέσει ακόμα προϊόντα στο καλάθι σου
  order_summary: Σύνοψη Παραγγελίας
  subtotal: Υποσύνολο
  vat: ΦΠΑ
  discount: Έκπτωση
  total: Σύνολο
  proceed_to_checkout: Ολοκλήρωση Παραγγελίας
</i18n>
