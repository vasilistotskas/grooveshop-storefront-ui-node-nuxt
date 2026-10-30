<script lang="ts" setup>
/**
 * One cart line, as the boards draw it: the photograph on a sunken tile,
 * the brand and the name, the quantity stepper and "Remove", and the
 * line's price on the right, with "2 × unit" under it for more than one.
 * A cart line carries no prior price, so it announces no reduction.
 *
 * `compact` is the cart drawer's row: no brand, and an icon-only remove
 * beside the stepper. The quantity control is the shared
 * `QuantitySelector` (optimistic mirror, debounce, serialised writes,
 * revert on a refusal). Removing a line offers "Undo" in a toast, which
 * adds the same product and quantity back.
 *
 * The cart payload carries no variant axes (the product page fetches
 * them per product), so the board's "Black · 20,000mAh" line is left
 * out rather than guessed from every attribute.
 */
const props = defineProps<{
  cartItem: CartItem
  compact?: boolean
}>()

const { productUrl } = useUrls()
const { t, n, locale } = useStoreI18n('components/Cart/ItemCard')
const toast = useToast()
const { notify } = useApiError()
const loadingIcon = useAppConfig().ui.icons.loading
const { deleteCartItem, createCartItem } = useCartStore()

const name = computed(() => extractTranslated(props.cartItem.product, 'name', locale.value) ?? '')
const link = computed(() => ({ path: productUrl(props.cartItem.product.id, props.cartItem.product.slug) }))
const quantity = computed(() => props.cartItem.quantity ?? 1)

const removing = ref(false)

async function remove() {
  // The line is gone once Django deletes it, so "Undo" can only add the
  // same product and quantity back as a new line.
  const snapshot = { productId: props.cartItem.product.id, quantity: quantity.value, name: name.value }
  removing.value = true
  showOrUpdateToast(toast, CART_REMOVE_TOAST_ID, pendingToastContent(loadingIcon, {
    title: t('toast.removing_title'),
    description: name.value,
  }))
  try {
    await deleteCartItem(props.cartItem.id)
  }
  catch (error) {
    log.error({ action: 'cart:deleteItem', error })
    notify(CART_REMOVE_TOAST_ID, error, { title: t('toast.delete_failed') })
    return
  }
  finally {
    removing.value = false
  }

  showOrUpdateToast(toast, CART_REMOVE_TOAST_ID, {
    title: t('toast.removed_title'),
    description: t('toast.removed_description', { name: snapshot.name }),
    color: 'neutral',
    icon: 'i-lucide-trash-2',
    duration: 8000,
    actions: [{
      label: t('toast.undo'),
      color: 'neutral',
      variant: 'outline',
      onClick: async (event?: Event) => {
        event?.stopPropagation?.()
        try {
          await createCartItem({ product: snapshot.productId, quantity: snapshot.quantity })
        }
        catch (error) {
          log.error({ action: 'cart:undoRemove', error })
          notify('ItemCard:2', error, { title: t('toast.undo_failed') })
        }
      },
    }],
  })
}
</script>

<template>
  <div :class="['flex', compact ? 'gap-3' : 'gap-4 sm:gap-5']">
    <!-- A sized box around the link: Anchor is `w-full`, and as the row's
         flex item it would stretch over the name and price. -->
    <div
      :class="[
        'shrink-0 overflow-hidden rounded-[0.75rem] bg-elevated',
        compact ? 'size-19' : 'size-20 sm:size-24',
      ]"
    >
      <Anchor
        :to="link"
        :title="name"
        class="block size-full"
      >
        <ImgWithFallback
          :src="cartItem.product.mainImagePath"
          :alt="name"
          :width="96"
          :height="96"
          fit="cover"
          loading="lazy"
          densities="x1 x2"
          class="size-full object-cover"
        />
      </Anchor>
    </div>

    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-0.5">
          <p
            v-if="!compact && cartItem.product.brandName"
            class="text-[0.6875rem] font-bold tracking-[0.08em] text-toned uppercase"
          >
            {{ cartItem.product.brandName }}
          </p>
          <Anchor
            :to="link"
            class="line-clamp-2 text-sm font-semibold text-highlighted sm:text-base"
          >
            {{ name }}
          </Anchor>
        </div>
        <div class="flex shrink-0 flex-col items-end">
          <p class="font-mono font-bold text-highlighted">
            {{ n(cartItem.totalPrice, 'currency') }}
          </p>
          <p
            v-if="quantity > 1"
            class="font-mono text-xs text-toned"
          >
            {{ t('each', { quantity, price: n(cartItem.finalPrice, 'currency') }) }}
          </p>
        </div>
      </div>

      <div class="mt-auto flex items-center justify-between gap-3 pt-2">
        <div class="w-28 shrink-0">
          <QuantitySelector
            :max="cartItem.product.stock"
            :cart-item-id="cartItem.id"
          />
        </div>
        <UButton
          :label="compact ? undefined : t('remove')"
          :aria-label="t('remove_named', { name })"
          :loading="removing"
          icon="i-lucide-trash-2"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="remove"
        />
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  each: "{quantity} × {price}"
  remove: Αφαίρεση
  remove_named: Αφαίρεση του «{name}» από το καλάθι
  toast:
    removing_title: Αφαίρεση από το καλάθι…
    removed_title: Αφαιρέθηκε από το καλάθι
    removed_description: Το «{name}» αφαιρέθηκε.
    undo: Αναίρεση
    undo_failed: Η αναίρεση δεν έγινε
    delete_failed: Δεν αφαιρέθηκε από το καλάθι. Δοκίμασε ξανά.
en:
  each: "{quantity} × {price}"
  remove: Remove
  remove_named: Remove “{name}” from the cart
  toast:
    removing_title: Removing from your cart…
    removed_title: Removed from your cart
    removed_description: “{name}” was removed.
    undo: Undo
    undo_failed: That could not be undone
    delete_failed: It was not removed from the cart. Please try again.
</i18n>
