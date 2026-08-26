<script lang="ts" setup>
const cartStore = useCartStore()
const { getCartItems } = storeToRefs(cartStore)

const { t, locale } = useI18n()
const { $i18n } = useNuxtApp()
const { productUrl } = useUrls()
</script>

<template>
  <div
    v-if="getCartItems?.length"
    class="max-h-48 space-y-2 overflow-auto pr-1"
  >
    <div class="sr-only items-center justify-center">
      <h3
        class="
          text-base font-bold text-primary-950
          dark:text-primary-50
        "
      >
        {{ t('items') }}
      </h3>
    </div>
    <div
      v-for="item in getCartItems"
      :key="item.id"
      class="flex items-center gap-3"
    >
      <Anchor
        :to="{ path: productUrl(item.product.id, item.product.slug) }"
        :title="extractTranslated(item.product, 'name', locale)"
        :ui="{ base: 'p-0' }"
        class="shrink-0"
      >
        <div
          class="
            relative size-12 overflow-hidden rounded-md bg-white
            dark:bg-primary-900
          "
        >
          <ImgWithFallback
            loading="lazy"
            class="size-full bg-transparent object-contain"
            :width="48"
            :height="48"
            fit="contain"
            :background="'transparent'"
            :src="item.product.mainImagePath"
            :alt="extractTranslated(item.product, 'name', locale)"
            densities="x1"
          />
          <span
            class="
              absolute right-0 bottom-0 rounded-tl-md bg-primary-950/80
              px-1 text-[10px] font-semibold text-white
            "
          >×{{ item.quantity }}</span>
        </div>
      </Anchor>
      <div class="min-w-0 flex-1">
        <Anchor
          :title="extractTranslated(item.product, 'name', locale)"
          :to="{ path: productUrl(item.product.id, item.product.slug) }"
          :ui="{ base: 'p-0' }"
        >
          <span
            class="
              line-clamp-2 text-sm font-semibold text-primary-950
              dark:text-primary-50
            "
          >
            {{ extractTranslated(item.product, 'name', locale) }}
          </span>
        </Anchor>
        <p
          v-if="item.finalPrice"
          class="text-xs text-muted"
        >
          {{ item.quantity }} × {{ $i18n.n(item.finalPrice, 'currency') }}
        </p>
      </div>
      <span
        v-if="item.finalPrice"
        class="
          shrink-0 text-sm font-semibold text-primary-950
          dark:text-primary-50
        "
      >
        {{ $i18n.n(item.finalPrice * (item.quantity || 1), 'currency') }}
      </span>
    </div>
  </div>
</template>
