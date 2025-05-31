<script lang="ts" setup>
const cartStore = useCartStore()
const { getCartItems } = storeToRefs(cartStore)

const { locale } = useI18n()
const { $i18n } = useNuxtApp()
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
        {{ $i18n.t('items') }}
      </h3>
    </div>
    <div
      v-if="getCartItems?.length"
      class="h-[6rem] overflow-auto"
    >
      <div
        v-for="item in getCartItems"
        :key="item.id"
        class="
            flex gap-4 justify-between

            md:py-2
          "
      >
        <div class="flex items-center">
          <Anchor
            :title="extractTranslated(item.product, 'name', locale)"
            :to="{ path: item.product.absoluteUrl }"
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
          <span
            v-if="item.finalPrice" class="
                              text-primary-950 text-sm

                dark:text-primary-50
            "
          >
            {{ $i18n.n(item.finalPrice, 'currency') }}
          </span>
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
            <span
              class="
                  text-primary-950 text-sm

                  dark:text-primary-50
            "
            >
              {{ $i18n.n(item.finalPrice * item.quantity, 'currency') }}
            </span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
