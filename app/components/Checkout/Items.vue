<script lang="ts" setup>
const cartStore = useCartStore()
const { getCartItems } = storeToRefs(cartStore)

const { locale } = useI18n()
</script>

<template>
  <div class="items">
    <div class="sr-only items-center justify-center">
      <h3
        class="
          text-primary-950 text-md font-bold

          dark:text-primary-50
        "
      >
        {{ $t('items') }}
      </h3>
    </div>
    <ClientOnly>
      <div
        v-if="getCartItems?.length"
        class="h-[185px] overflow-auto border-b border-t border-primary-500 py-4"
      >
        <div
          v-for="item in getCartItems"
          :key="item.id"
          class="
            grid gap-4

            md:py-2
          "
        >
          <div class="grid grid-cols-[1fr_auto_auto_auto] gap-4">
            <div class="flex items-center">
              <Anchor
                :title="extractTranslated(item.product, 'name', locale)"
                :to="item.product.absoluteUrl"
              >
                <span
                  class="
                    text-primary-950 text-sm font-bold

                    dark:text-primary-50
                  "
                >
                  {{ extractTranslated(item.product, 'name', locale) }}
                </span>
              </Anchor>
            </div>
            <div class="flex items-center">
              <I18nN
                v-if="item.finalPrice"
                tag="span"
                class="
                  text-primary-950 text-sm

                  dark:text-primary-50
                "
                format="currency"
                :value="item.finalPrice"
              />
            </div>
            <div class="flex items-center">
              <span
                class="
                  text-primary-950 text-sm

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
                  text-primary-950 text-sm

                  dark:text-primary-50
                "
              >
                <I18nN
                  tag="span"
                  class="
                    text-primary-950 text-sm

                    dark:text-primary-50
                  "
                  format="currency"
                  :value="item.finalPrice * item.quantity"
                />
              </span>
            </div>
          </div>
        </div>
      </div>
      <template #fallback>
        <ClientOnlyFallback height="185px" />
      </template>
    </ClientOnly>
  </div>
</template>
