<script lang="ts" setup>
const cartStore = useCartStore()
const { getCartItems } = storeToRefs(cartStore)

const { locale } = useI18n()
const { $i18n } = useNuxtApp()
const { productUrl } = useUrls()
</script>

<template>
  <div
    v-if="getCartItems?.length"
    class="h-[6rem] overflow-auto"
  >
    <div class="sr-only items-center justify-center">
      <h3
        class="
          text-base font-bold text-primary-950
          dark:text-primary-50
        "
      >
        {{ $i18n.t('items') }}
      </h3>
    </div>
    <div
      v-for="item in getCartItems"
      :key="item.id"
      class="
        flex justify-between gap-4
        md:py-2
      "
    >
      <div class="flex items-center">
        <Anchor
          :title="extractTranslated(item.product, 'name', locale)"
          :to="{ path: productUrl(item.product.id, item.product.slug) }"
        >
          <span
            class="
              text-sm font-bold text-primary-950
              dark:text-primary-50
            "
          >
            {{ extractTranslated(item.product, 'name', locale) }}
          </span>
        </Anchor>
      </div>
      <div class="flex items-center">
        <span
          v-if="item.finalPrice"
          class="
            text-sm text-primary-950
            dark:text-primary-50
          "
        >
          {{ $i18n.n(item.finalPrice, 'currency') }}
        </span>
      </div>
      <div class="flex items-center">
        <span
          class="
            text-sm text-primary-950
            dark:text-primary-50
          "
        >
          {{ item.quantity }}x
        </span>
      </div>
      <div class="flex items-center">
        <span
          v-if="item.finalPrice"
          class="
            text-sm text-primary-950
            dark:text-primary-50
          "
        >
          <span
            class="
              text-sm text-primary-950
              dark:text-primary-50
            "
          >
            {{ $i18n.n(item.finalPrice * (item.quantity || 1), 'currency') }}
          </span>
        </span>
      </div>
    </div>
  </div>
</template>
