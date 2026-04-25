<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  cartItem: { type: Object as PropType<CartItem>, required: true },
})

const { productUrl } = useUrls()
const { t, locale } = useI18n()
const { $i18n } = useNuxtApp()
const { isMobileOrTablet } = useDevice()
const toast = useToast()
const cartStore = useCartStore()
const { deleteCartItem, createCartItem } = cartStore

const { contentShorten } = useText()

const { cartItem } = toRefs(props)

const alt = computed(() => {
  return extractTranslated(cartItem?.value?.product, 'name', locale.value)
})

const deleteCartItemEvent = async ({ cartItemId }: { cartItemId: number }) => {
  // Snapshot the product + quantity before deletion so the toast's
  // Undo action can re-create the same line. Once the backend deletes
  // the row, cartItem.id is gone forever — we can only add a fresh
  // line via createCartItem.
  const snapshot = {
    productId: cartItem.value?.product?.id,
    quantity: cartItem.value?.quantity ?? 1,
    name: alt.value,
  }

  try {
    await deleteCartItem(cartItemId)
  }
  catch (err) {
    log.error({ action: 'cart:deleteItem', error: err })
    toast.add({
      title: t('toast.delete_failed'),
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
    return
  }

  if (!snapshot.productId) return

  toast.add({
    title: t('toast.removed_title'),
    description: t('toast.removed_description', { name: snapshot.name }),
    color: 'neutral',
    icon: 'i-heroicons-trash',
    duration: 8000,
    actions: [
      {
        label: t('toast.undo'),
        color: 'primary',
        variant: 'subtle',
        onClick: async (event?: Event) => {
          event?.stopPropagation?.()
          try {
            await createCartItem({
              product: snapshot.productId!,
              quantity: snapshot.quantity,
            })
          }
          catch (err) {
            log.error({ action: 'cart:undoRemove', error: err })
            toast.add({
              title: t('toast.undo_failed'),
              color: 'error',
            })
          }
        },
      },
    ],
  })
}

const formattedPrice = computed(() => {
  return cartItem.value?.finalPrice ? $i18n.n(cartItem.value.finalPrice, 'currency') : '-'
})

const formattedTotal = computed(() => {
  return cartItem.value?.totalPrice ? $i18n.n(cartItem.value.totalPrice, 'currency') : '-'
})
</script>

<template>
  <div
    v-if="cartItem"
    class="
      flex flex-col gap-4
      sm:flex-row sm:gap-6
    "
  >
    <div
      class="
        relative h-24 w-full flex-shrink-0 overflow-hidden rounded-lg
        sm:w-24
      "
    >
      <Anchor
        :to="{ path: productUrl(cartItem.product.id, cartItem.product.slug) }"
        :title="alt"
        :ui="{
          base: 'p-0',
        }"
      >
        <ImgWithFallback
          loading="lazy"
          class="h-full w-full bg-transparent object-contain"
          :width="96"
          :height="96"
          fit="contain"
          :background="'transparent'"
          :src="cartItem.product.mainImagePath"
          :alt="alt"
          densities="x1"
        />
      </Anchor>
    </div>

    <div class="flex flex-1 flex-col">
      <div
        class="
          md:relative flex flex-col gap-2
          sm:flex-row sm:justify-between sm:gap-0
        "
      >
        <div>
          <h3 class="text-base font-medium">
            <Anchor
              :to="{ path: productUrl(cartItem.product.id, cartItem.product.slug) }"
              :title="alt"
              :ui="{
                base: 'p-0',
              }"
            >
              {{ contentShorten(alt, 50) }}
            </Anchor>
          </h3>
          <div
            class="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500"
          >
            <span>{{ t('price') }}: {{ formattedPrice }}</span>
            <span
              v-if="cartItem.discountValue"
              class="text-green-600"
            >
              ({{ t('save') }} {{ $i18n.n(cartItem.discountValue, 'currency') }} / {{ t('per_item') }})
            </span>
          </div>
        </div>

        <UButton
          :class="isMobileOrTablet ? 'absolute top-0 right-0' : ''"
          color="error"
          variant="link"
          icon="i-fa6-solid-trash"
          size="sm"
          :title="t('remove_from_cart', { name: alt })"
          @click="deleteCartItemEvent({ cartItemId: cartItem.id })"
        />
      </div>

      <div
        class="
          mt-4 flex flex-col gap-4
          sm:flex-row sm:items-center sm:justify-between sm:gap-0
        "
      >
        <div
          class="
            w-full
            sm:w-32
          "
        >
          <QuantitySelector
            :max="cartItem.product.stock"
            :cart-item-id="cartItem.id"
          />
        </div>
        <p class="text-sm font-medium">
          {{ t('total') }}: {{ formattedTotal }}
        </p>
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  remove_from_cart: Αφαίρεση από το καλάθι {name}
  per_item: Ανά τεμάχιο
  price: Τιμή
  save: Έκπτωση
  total: Σύνολο
  toast:
    removed_title: Αφαιρέθηκε από το καλάθι
    removed_description: Το προϊόν "{name}" αφαιρέθηκε.
    undo: Αναίρεση
    undo_failed: Η αναίρεση απέτυχε
    delete_failed: Αποτυχία αφαίρεσης από το καλάθι
</i18n>
