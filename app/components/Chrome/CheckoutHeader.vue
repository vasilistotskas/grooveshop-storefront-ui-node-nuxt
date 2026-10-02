<script lang="ts" setup>
/**
 * The checkout's header: the way back to the cart, the store's logo and
 * the reassurance that the page is secure — nothing that would lead the
 * shopper out of the checkout.
 *
 * Three equal outer columns keep the logo centred whatever the two
 * sides hold. On a phone the back link shortens to "Cart" and the
 * reassurance to its lock icon, which keeps its name for screen readers.
 */
const { t } = useI18n()
const localePath = useLocalePath()
const tenantStore = useTenantStore()

const appTitle = computed(() => tenantStore.storeName || '')
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-default bg-default">
    <UContainer
      class="
        grid h-(--ui-header-height) grid-cols-[1fr_auto_1fr] items-center
        gap-3
      "
    >
      <UButton
        :to="localePath('cart')"
        :aria-label="t('back_to_cart')"
        icon="i-heroicons-chevron-left"
        color="neutral"
        variant="ghost"
        size="sm"
        class="justify-self-start px-2.5"
      >
        <span class="lg:hidden">{{ t('cart') }}</span>
        <span
          class="
            hidden
            lg:inline
          "
        >{{ t('back_to_cart') }}</span>
      </UButton>

      <Anchor
        :to="'index'"
        :aria-label="appTitle"
        class="!w-auto flex items-center"
      >
        <TenantLogo
          :width="132"
          :height="34"
          priority
          img-class="object-center"
        />
        <span class="sr-only">{{ appTitle }}</span>
      </Anchor>

      <span
        class="
          inline-flex items-center gap-1.5 justify-self-end text-[0.8125rem]
          font-bold text-success
        "
      >
        <UIcon
          name="i-heroicons-lock-closed"
          class="size-4"
        />
        <span
          class="
            sr-only
            lg:not-sr-only
          "
        >{{ t('secure_checkout') }}</span>
      </span>
    </UContainer>
  </header>
</template>

<i18n lang="yaml">
el:
  back_to_cart: Επιστροφή στο καλάθι
  cart: Καλάθι
  secure_checkout: Ασφαλής ολοκλήρωση αγοράς
en:
  back_to_cart: Back to cart
  cart: Cart
  secure_checkout: Secure checkout
</i18n>
