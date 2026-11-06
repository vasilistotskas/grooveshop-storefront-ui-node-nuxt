<script lang="ts" setup>
// Where a payment provider returns a shopper, and an older link lands. It holds
// the order's key in its address, so it runs no trackers (`isPrivateUrl`), keeps
// the arrival in this tab and forwards to the confirmation, replacing itself in
// the history. In the browser only: the storage is the tab's.
defineRouteRules({
  robots: false,
})
definePageMeta({
  layout: 'default',
})
const route = useRoute()
const localePath = useLocalePath()

const first = (value: unknown) => {
  const one = Array.isArray(value) ? value[0] : value
  return typeof one === 'string' ? one : undefined
}

onMounted(async () => {
  const orderUuid = first((route.params as Record<string, unknown>).uuid)
  if (!orderUuid) return
  writeCheckoutArrival({
    orderUuid,
    sessionId: first(route.query.session_id),
    vivaOrderCode: first(route.query.s),
    placed: first(route.query.placed) === '1',
  })
  await navigateTo(localePath({ name: 'checkout-success' }), { replace: true })
})
</script>

<template>
  <div class="min-h-[60vh]" />
</template>
