<script lang="ts" setup>
const cartStore = useCartStore()
const localePath = useLocalePath()
const { cart, pending } = storeToRefs(cartStore)
const { t } = useI18n({ useScope: 'local' })

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container grid grid-rows-auto-1fr gap-4">
    <ClientOnly>
      <div
        v-if="!pending && cart?.cartItems?.length"
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
      <template v-if="pending">
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
      <template #fallback>
        <ClientOnlyFallback
          height="320px"
          width="100%"
        />
      </template>
    </ClientOnly>

    <div class="grid items-center">
      <h2 class="grid justify-items-center justify-self-end">
        <UButton
          :label="t('checkout')"
          :to="localePath('checkout')"
          class="capitalize"
          color="primary"
          size="xl"
          variant="soft"
        />
      </h2>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  checkout: Ολοκλήρωση αγοράς
</i18n>
