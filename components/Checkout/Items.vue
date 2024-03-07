<script lang="ts" setup>
const cartStore = useCartStore()
const { getCartItems } = storeToRefs(cartStore)

const { locale } = useI18n()
</script>

<template>
  <div class="items">
    <div class="sr-only items-center justify-center">
      <h3 class="text-primary-700 dark:text-primary-100 text-md font-bold">
        {{ $t('components.checkout.items.title') }}
      </h3>
    </div>
    <ClientOnly>
      <div
        v-if="getCartItems?.length"
        class="max-h-[185px] overflow-auto border-b border-t border-gray-200 py-4"
      >
        <div v-for="item in getCartItems" :key="item.id" class="grid gap-4 md:p-4">
          <div class="grid grid-cols-[1fr_auto_auto] gap-4">
            <div class="flex items-center">
              <Anchor
                :title="extractTranslated(item.product, 'name', locale)"
                :to="`/product${item.product.absoluteUrl}`"
              >
                <span class="text-primary-700 dark:text-primary-100 text-sm font-bold">
                  {{ extractTranslated(item.product, 'name', locale) }}
                </span>
              </Anchor>
            </div>
            <div class="flex items-center">
              <span class="text-primary-700 dark:text-primary-100 text-sm">
                {{ item.quantity }}x
              </span>
            </div>
            <div class="flex items-center">
              <span
                v-if="item.finalPrice"
                class="text-primary-700 dark:text-primary-100 text-sm"
              >
                <I18nN
                  tag="span"
                  class="text-primary-700 dark:text-primary-100 text-sm"
                  format="currency"
                  :value="item.finalPrice * item.quantity"
                />
              </span>
            </div>
          </div>
        </div>
      </div>
      <template #fallback>
        <ClientOnlyFallback height="185px" width="416px" />
      </template>
    </ClientOnly>
  </div>
</template>
