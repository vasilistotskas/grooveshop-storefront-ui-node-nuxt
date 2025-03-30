<script lang="ts" setup>
const cartStore = useCartStore()
const localePath = useLocalePath()
const { cart, pending } = storeToRefs(cartStore)
const { t } = useI18n({ useScope: 'local' })
const { $i18n } = useNuxtApp()

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
      <div
        v-if="pending"
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
      <LazyEmptyState
        v-if="!pending && !cart?.cartItems?.length"
        class="w-full"
        :title="$i18n.t('empty.title')"
      >
        <template
          #icon
        >
          <UIcon
            name="i-heroicons-shopping-cart"
            size="xl"
          />
        </template>
        <template
          #actions
        >
          <UButton
            :label="$i18n.t('empty.description')"
            :to="localePath('index')"
            class="font-semibold"
            color="secondary"
            size="xl"
            type="button"
          />
        </template>
      </LazyEmptyState>
      <template #fallback>
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
    </ClientOnly>

    <div class="grid items-center">
      <h2 class="grid justify-items-center justify-self-end">
        <UButton
          :label="t('checkout')"
          :to="localePath('checkout')"
          class="capitalize"
          color="neutral"
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
  empty:
    title: Το καλάθι σου είναι άδειο
    description: Συνέχεια
</i18n>
