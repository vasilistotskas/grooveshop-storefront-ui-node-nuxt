<script lang="ts" setup>
import emptyIcon from '~icons/mdi/package-variant-remove'

const cartStore = useCartStore()
const { cart, pending } = storeToRefs(cartStore)

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container grid grid-rows-auto-1fr gap-4">
    <PageBody>
      <ClientOnly>
        <div
          v-if="!pending.cart && cart?.cartItems?.length"
          class="
            products grid gap-4

            md:grid-rows-1
          "
        >
          <CartItemCard
            v-for="(cartItem, index) in cart.cartItems"
            :key="index"
            :cart-item="cartItem"
          />
        </div>
        <template v-if="pending.cart">
          <div
            class="
              no-products grid gap-4

              md:grid-rows-1
            "
          >
            <ClientOnlyFallback
              v-for="index in 3"
              :key="index"
              height="122px"
              width="100%"
            />
          </div>
        </template>
        <EmptyState
          v-if="!pending.cart && !cart?.cartItems?.length"
          :icon="emptyIcon"
        >
          <template #actions>
            <UButton
              :label="$t('common.empty.button')"
              :to="'index'"
              color="primary"
            />
          </template>
        </EmptyState>
        <template #fallback>
          <ClientOnlyFallback
            width="100%"
            height="320px"
          />
        </template>
      </ClientOnly>
    </PageBody>
    <div class="grid items-center">
      <h2 class="grid justify-items-center justify-self-end">
        <UButton
          :label="$t('pages.cart.checkout')"
          class="capitalize"
          color="primary"
          variant="soft"
          size="xl"
          :to="'checkout'"
        />
      </h2>
    </div>
  </PageWrapper>
</template>
