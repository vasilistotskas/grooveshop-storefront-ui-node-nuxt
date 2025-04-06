<script lang="ts" setup>
const cartStore = useCartStore()
const localePath = useLocalePath()
const { cart, pending } = storeToRefs(cartStore)
const { t, n } = useI18n({ useScope: 'local' })
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

// Card UI configurations
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

    <div class="w-full relative flex flex-col lg:flex-row gap-4 lg:gap-8">
      <!-- Main Content -->
      <div class="w-full grid content-start gap-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 class="text-2xl font-bold">
            {{ t('shopping_cart') }}
          </h1>
          <ClientOnly>
            <p v-if="cart?.totalItems" class="text-gray-500">
              {{ t('items_in_cart', { count: cart.totalItems }) }}
            </p>
            <template #fallback>
              <USkeleton
                class="h-6 w-24"
              />
            </template>
          </ClientOnly>
        </div>

        <!-- Cart Items -->
        <ClientOnly>
          <!-- Items List -->
          <div
            v-if="!pending && cart?.cartItems?.length"
            class="flex flex-col w-full gap-4"
          >
            <UCard
              v-for="(cartItem, index) in cart.cartItems"
              :key="index"
              v-bind="cardConfig"
              :ui="mainCardUI"
            >
              <CartItemCard :cart-item="cartItem" />
            </UCard>
          </div>

          <!-- Loading State -->
          <div v-if="pending" class="flex flex-col w-full gap-4">
            <UCard
              v-for="index in 2"
              :key="index"
              v-bind="cardConfig"
              :ui="mainCardUI"
            >
              <div class="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <!-- Product Image Skeleton -->
                <USkeleton class="h-24 w-full sm:w-24 rounded-lg flex-shrink-0" />

                <!-- Product Details Skeleton -->
                <div class="flex-1">
                  <div class="flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-0">
                    <div class="space-y-2">
                      <USkeleton class="h-5 w-48" />
                      <USkeleton class="h-4 w-32" />
                    </div>
                    <USkeleton class="h-8 w-8" />
                  </div>
                  <div class="flex flex-col sm:flex-row sm:justify-between mt-4 gap-4 sm:gap-0">
                    <USkeleton class="h-8 w-32" />
                    <USkeleton class="h-5 w-24" />
                  </div>
                </div>
              </div>
            </UCard>
          </div>

          <!-- Empty State -->
          <UCard
            v-if="!pending && !cart?.cartItems?.length"
            v-bind="cardConfig"
            :ui="emptyCardUI"
            class="text-center"
          >
            <UIcon
              name="i-heroicons-shopping-cart"
              class="h-16 w-16 text-gray-400 mx-auto"
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
              color="primary"
              variant="solid"
              size="lg"
              class="mt-4"
            >
              {{ $i18n.t('empty.description') }}
            </UButton>
          </UCard>

          <template #fallback>
            <div class="flex flex-col w-full gap-4">
              <UCard
                v-for="index in 2"
                :key="index"
                v-bind="cardConfig"
                :ui="mainCardUI"
              >
                <div class="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  <USkeleton class="h-24 w-full sm:w-24 rounded-lg flex-shrink-0" />
                  <div class="flex-1">
                    <div class="flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-0">
                      <div class="space-y-2">
                        <USkeleton class="h-5 w-48" />
                        <USkeleton class="h-4 w-32" />
                      </div>
                      <USkeleton class="h-8 w-8" />
                    </div>
                    <div class="flex flex-col sm:flex-row sm:justify-between mt-4 gap-4 sm:gap-0">
                      <USkeleton class="h-8 w-32" />
                      <USkeleton class="h-5 w-24" />
                    </div>
                  </div>
                </div>
              </UCard>
            </div>
          </template>
        </ClientOnly>
      </div>

      <!-- Order Summary -->
      <ClientOnly>
        <div
          v-if="cart?.cartItems?.length"
          class="w-full lg:max-w-md"
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

            <!-- Summary Content -->
            <div class="grid gap-4">
              <div class="flex justify-between">
                <span>{{ t('subtotal') }}</span>
                <span>{{ n(cart.totalPrice - cart.totalVatValue, 'currency') }}</span>
              </div>
              <div class="flex justify-between">
                <span>{{ t('vat') }}</span>
                <span>{{ n(cart.totalVatValue, 'currency') }}</span>
              </div>
              <div
                v-if="cart.totalDiscountValue > 0"
                class="flex justify-between text-green-600"
              >
                <span>{{ t('discount') }}</span>
                <span>-{{ n(cart.totalDiscountValue, 'currency') }}</span>
              </div>
              <USeparator />
              <div class="flex justify-between font-semibold">
                <span>{{ t('total') }}</span>
                <span>{{ n(cart.totalPrice, 'currency') }}</span>
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

        <template #fallback>
          <div class="w-full lg:max-w-md">
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
        </template>
      </ClientOnly>
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
