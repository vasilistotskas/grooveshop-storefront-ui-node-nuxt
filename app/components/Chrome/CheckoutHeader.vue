<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()
const tenantStore = useTenantStore()

const appTitle = computed(() => tenantStore.storeName || (config.public.appTitle as string))
</script>

<template>
  <header
    class="
      sticky top-0 z-40 w-full border-b border-primary-200
      bg-transparent backdrop-blur-md
      dark:border-primary-800
    "
  >
    <!-- Mobile: 3-column grid (back | logo | spacer) guarantees the
         logo column is centered regardless of the back-button width.
         Desktop: single flex row with the logo at the top-left. -->
    <div
      class="
        mx-auto grid w-full max-w-(--ui-container)
        grid-cols-[auto_1fr_auto] items-center px-4 py-3
        sm:px-6
        md:py-4
        lg:flex lg:px-8
      "
    >
      <UButton
        :aria-label="t('back_to_cart')"
        :title="t('back_to_cart')"
        :to="localePath('cart')"
        icon="i-heroicons-arrow-left"
        color="neutral"
        variant="soft"
        size="lg"
        square
        class="
          rounded-full justify-self-start
          lg:hidden
        "
      />

      <Anchor
        :to="'index'"
        :aria-label="appTitle"
        class="
          flex items-center justify-center justify-self-center
          lg:justify-start lg:justify-self-start
        "
      >
        <TenantLogo
          :width="145"
          :height="40"
          priority
          img-class="
            object-center
            lg:object-left
          "
        />
        <span class="sr-only">{{ appTitle }}</span>
      </Anchor>

      <!-- Spacer matches the back-button square so the middle
           column stays geometrically centered. -->
      <div
        class="
          size-9 justify-self-end
          lg:hidden
        "
        aria-hidden="true"
      />
    </div>
  </header>
</template>

<i18n lang="yaml">
el:
  back_to_cart: Επιστροφή στο καλάθι
en:
  back_to_cart: Back to cart
</i18n>
