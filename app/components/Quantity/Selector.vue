<script lang="ts" setup>
import { watchDebounced } from '@vueuse/core'

/**
 * Cart quantity stepper.
 *
 * Previously fired `updateCartItem` on every `+/-` click, one API
 * roundtrip per increment. Now the UI mirrors clicks instantly via an
 * optimistic local ref, and a single debounced write (400ms after the
 * last change) persists to the server. On 4xx, revert to the store's
 * canonical value.
 */

const props = defineProps({
  max: { type: Number, required: false, default: 1 },
  cartItemId: { type: Number, required: true },
})

const toast = useToast()
const cartStore = useCartStore()
const { updateCartItem } = cartStore
const { cart, error } = storeToRefs(cartStore)

const serverQuantity = computed(() => {
  const item = cart.value?.items?.find(i => i.id === props.cartItemId)
  return item?.quantity ?? 0
})

// Optimistic local mirror; updated immediately on click, reconciles
// with the server's value when the server echo differs (e.g., another
// tab edited the same cart).
const optimisticQuantity = ref(serverQuantity.value)
watch(serverQuantity, (v) => {
  if (!isUpdating.value) optimisticQuantity.value = v
})

const isUpdating = ref(false)

async function commit(value: number) {
  if (value < 1 || value > props.max) return
  if (value === serverQuantity.value) return

  isUpdating.value = true
  try {
    await updateCartItem(props.cartItemId, { quantity: value })
  }
  catch (err) {
    log.error({ action: 'cart:updateQuantity', error: err })
    // Revert to the server value on failure.
    optimisticQuantity.value = serverQuantity.value
  }
  finally {
    isUpdating.value = false
  }

  const errorData = error.value?.data?.data as Record<string, unknown> | undefined
  const nonFieldErrors = errorData?.nonFieldErrors as string[] | undefined
  if (nonFieldErrors && nonFieldErrors.length > 0) {
    nonFieldErrors.forEach((e: string) => {
      toast.add({ title: e, color: 'error' })
    })
  }
}

// Debounce commit so rapid +/- presses coalesce into a single request.
watchDebounced(
  optimisticQuantity,
  v => commit(v),
  { debounce: 400, maxWait: 2000 },
)
</script>

<template>
  <UInputNumber
    v-model="optimisticQuantity"
    :min="1"
    :max="max"
    :step="1"
    color="neutral"
    size="sm"
    variant="outline"
  />
</template>
