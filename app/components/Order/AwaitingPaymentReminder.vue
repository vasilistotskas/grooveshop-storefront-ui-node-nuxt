<script lang="ts" setup>
/**
 * On the cart and the checkout, in every design: the order this browser
 * placed that still waits for its online payment, with «Pay now» and a link
 * to it (`useAwaitingPaymentOrder`, `OrderPayNow`). Nothing until the page
 * has mounted, and nothing without such an order.
 */
const order = useAwaitingPaymentOrder()
</script>

<template>
  <OrderPayNow
    v-if="order"
    :order="order"
    reminder
  />
</template>
