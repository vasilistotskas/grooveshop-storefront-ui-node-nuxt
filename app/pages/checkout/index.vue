<script lang="ts" setup>
definePageMeta({
  layout: 'checkout',
  middleware: [
    function (to) {
      const { $i18n } = useNuxtApp()
      const t = $i18n.t.bind($i18n)
      const localePath = useLocalePath()
      const toast = useToast()
      // The cart store is already populated by the setup plugin before any
      // page renders (and before client-side navigations). Re-fetching here
      // via useRequestHeaders() is both redundant and unsafe — the composable
      // is not supported inside inline page middleware on the server.
      const cartStore = useCartStore()
      const cartItems = cartStore.cart?.items

      if (!cartItems || cartItems.length === 0) {
        // A shopper returning from a cancelled/failed hosted-checkout
        // redirect (?canceled / ?error) has a legitimately empty cart —
        // the order was already created and the cart consumed
        // server-side. Bouncing them home with "cart empty" hid WHY the
        // payment didn't complete (the onMounted toast never ran because
        // this middleware bounced first). Surface the real reason.
        if (to.query.canceled) {
          toast.add({
            title: t('payment_canceled'),
            description: t('payment_canceled_description'),
            color: 'warning',
          })
        }
        else if (to.query.error) {
          toast.add({
            title: t('payment_error_title'),
            description: t('payment_error_description'),
            color: 'error',
          })
        }
        else {
          toast.add({
            title: t('cart_empty'),
            color: 'error',
          })
        }
        return navigateTo(localePath('index'))
      }
    },
  ],
})

const tenantStore = useTenantStore()
const body = computed(() => resolvePage('checkout', tenantStore.schemaName))
</script>

<template>
  <component
    :is="body"
  />
</template>
