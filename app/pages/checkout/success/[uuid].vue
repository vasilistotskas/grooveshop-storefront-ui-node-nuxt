<script lang="ts" setup>
// Where a payment provider returns a shopper, and an older link lands. It holds
// the order's key in its address, so it runs no trackers (`isPrivateUrl`) and
// forwards to the confirmation at once, replacing itself in the history.
defineRouteRules({
  robots: false,
  ssr: false,
})
const first = (value: unknown) => {
  const one = Array.isArray(value) ? value[0] : value
  return typeof one === 'string' ? one : undefined
}
definePageMeta({
  layout: 'default',
  middleware: (to) => {
    const localePath = useLocalePath()
    return navigateTo(checkoutSuccessLocation(localePath({ name: 'checkout-success' }), {
      orderUuid: first((to.params as Record<string, unknown>).uuid) ?? '',
      sessionId: first(to.query.session_id),
      vivaOrderCode: first(to.query.s),
      placed: first(to.query.placed) === '1',
    }), { replace: true })
  },
})
</script>

<template>
  <div />
</template>
