<script lang="ts" setup>
const cartStore = useCartStore()
const localePath = useLocalePath()
const {
  cart,
  pending,
  initialLoading,
  hasStockIssues,
} = storeToRefs(cartStore)
const { t } = useI18n()
const { getStockStatusMessage, clearCart } = cartStore
const toast = useToast()
// Cross-sell strip: plan flag AND merchant setting, fails CLOSED. The
// cart payload already carries ``recommendations`` seeded with every
// basket line, so the strip renders from the store — no extra fetch.
const tenantStore = useTenantStore()
const productSuggestionsEnabled = useSettingFlag('PRODUCT_SUGGESTIONS_ENABLED', {
  fallback: false,
})
const suggestionsEnabled = computed(
  () => tenantStore.recommendationsEnabled && productSuggestionsEnabled.value,
)
const ga4 = useGA4()
const viewCartFired = ref(false)

// GA4: view_cart fires once when the page mounts and the cart has
// finished loading with at least one item. Browser-only event with
// no Meta equivalent in the standard funnel — Meta uses the
// PageView pixel for cart-page attribution and reserves explicit
// cart events for AddToCart only.
watch(
  [pending, () => cart.value?.items?.length ?? 0],
  ([isPending, count]) => {
    if (import.meta.server) return
    if (isPending || count === 0 || viewCartFired.value) return
    try {
      ga4.trackViewCart({
        currency: cart.value?.currency ?? 'EUR',
        value: Number(cart.value?.totalPrice ?? 0),
        items:
          cart.value?.items?.map(item => ({
            item_id: String(item.product?.id ?? ''),
            quantity: Number(item.quantity ?? 0),
            price: Number(
              item.product?.finalPrice ?? item.product?.price ?? 0,
            ),
          })) ?? [],
      })
      viewCartFired.value = true
    }
    catch (pixelErr) {
      log.warn(
        'cart:ga4ViewCart',
        String((pixelErr as Error)?.message ?? pixelErr),
      )
    }
  },
  { immediate: true },
)

// The abandoned-cart recovery route forwards here with ``?recovered=1``.
// We surface a one-shot welcome banner so the shopper sees affirmation
// that their cart was preserved (stock reservations are NOT restored —
// items may have sold out in the interim, which the existing
// ``hasStockIssues`` alert below will flag naturally).
//
// Only render once the cart has loaded AND has at least one item —
// otherwise the "we kept your cart" copy is actively misleading for
// shoppers whose cart was emptied between email send and click. Once
// shown, we strip the ``recovered`` query param from the URL so a
// subsequent back-nav or reload doesn't re-trigger the banner.
const route = useRoute()
const router = useRouter()
const wasRecovered = ref(route.query.recovered === '1')
const showRecoveredBanner = computed(() =>
  wasRecovered.value
  && !pending.value
  && (cart.value?.items?.length ?? 0) > 0,
)

watch(showRecoveredBanner, (isShown) => {
  if (!isShown) return
  // Fire-and-forget: removing the query param is a nice-to-have for
  // back-nav; blocking the banner render on it would be a regression.
  router.replace({ query: { ...route.query, recovered: undefined } })
    .catch(() => {})
})

// The Viva return route forwards here with ``?paymentError=<code>``
// when it cannot resolve the post-payment redirect to an order
// (garbage/forged params). Surface a toast instead of dropping the
// shopper silently — /checkout can't host this feedback because its
// empty-cart middleware bounces to the homepage before any toast
// renders.
onMounted(() => {
  if (!route.query.paymentError) return
  toast.add({
    title: t('payment_lookup_failed_title'),
    description: t('payment_lookup_failed_description'),
    color: 'error',
  })
  router.replace({ query: { ...route.query, paymentError: undefined } })
    .catch(() => {})
})

const breadcrumb = computed(() => [{ label: t('shopping_cart') }])

// Free delivery: the store's cheapest free-carrier threshold. Not awaited
// — the cart renders without it and the banner joins when it lands.
const { data: freeShipping } = useFreeShippingInfo()
const freeDeliveryThreshold = computed(() => freeShipping.value?.minThreshold ?? 0)
const freeDeliveryUnlocked = computed(() =>
  freeDeliveryThreshold.value > 0
  && (cart.value?.totalPrice ?? 0) >= freeDeliveryThreshold.value,
)

const total = computed(() =>
  Math.max(0, (cart.value?.totalPrice ?? 0) - (cart.value?.promotionDiscount ?? 0)),
)

const isConfirmingClear = ref(false)
const clearing = ref(false)

const onClearCart = async () => {
  clearing.value = true
  try {
    await clearCart()
    isConfirmingClear.value = false
  }
  catch (error) {
    log.error({ action: 'cart:clearPage', error })
    toast.add({
      title: t('clear.error_title'),
      description: t('clear.error_description'),
      color: 'error',
      icon: 'i-lucide-circle-x',
    })
  }
  finally {
    clearing.value = false
  }
}

// Without a page-level title, setupPageHeader() falls back to the
// raw appTitle, which the siteName template then pads with
// " - <siteName>" on top, producing a duplicated brand suffix.
// Set a proper cart title so the document title reads
// "Καλάθι Αγορών - <siteName>".
useSeoMeta({
  title: () => t('shopping_cart'),
})
</script>

<template>
  <!-- `data-action-bar` tells the footer to keep its last line clear of
       the floating checkout bar (Chrome/Footer.vue). -->
  <div :data-action-bar="!initialLoading && cart?.items?.length ? '' : undefined">
    <UContainer class="flex flex-col gap-6 pt-6 pb-14 lg:gap-8 lg:pb-22">
      <PageBreadcrumb :items="breadcrumb" />

      <header class="flex flex-col gap-2">
        <h1
          class="
            font-display text-[1.875rem]/[1.1] font-bold tracking-[-0.02em]
            text-highlighted
            lg:text-[2.25rem]/[1.1]
          "
        >
          {{ t('title') }}
        </h1>
        <p
          v-if="!initialLoading && cart?.totalItems"
          class="text-toned"
        >
          {{ t('items_in_cart', { count: cart.totalItems }, cart.totalItems) }}
          <span
            v-if="freeDeliveryUnlocked"
            class="lg:hidden"
          >· {{ t('free_delivery_unlocked') }}</span>
        </p>
        <USkeleton
          v-else
          class="h-6 w-24"
        />
      </header>

      <UAlert
        v-if="showRecoveredBanner"
        color="info"
        variant="soft"
        icon="i-lucide-shopping-cart"
        :title="t('recovered.title')"
        :description="t('recovered.description')"
        :close="true"
        @update:open="(open: boolean) => !open && (wasRecovered = false)"
      />

      <UAlert
        v-if="!initialLoading && hasStockIssues"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="t('stock_alert.title')"
      />

      <LazyEmptyState
        v-if="!initialLoading && !cart?.items?.length"
        class="w-full"
        :title="t('empty.title')"
        :description="t('empty.description_long')"
      >
        <template #icon>
          <UIcon
            name="i-lucide-shopping-cart"
            size="xl"
          />
        </template>
        <template #actions>
          <UButton
            :to="localePath('index')"
            color="secondary"
            variant="solid"
            size="lg"
            icon="i-lucide-arrow-right"
            trailing
          >
            {{ t('empty.description') }}
          </UButton>
        </template>
      </LazyEmptyState>

      <div
        v-else
        class="
          grid gap-6
          lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-10
        "
      >
        <div class="flex min-w-0 flex-col gap-4">
          <template v-if="!initialLoading && cart?.items?.length">
            <CartBanners
              :cart-total="cart.totalPrice"
              :threshold="freeDeliveryThreshold"
              :near-misses="cart.promotionNearMiss || []"
            />

            <ul class="flex flex-col divide-y divide-default">
              <li
                v-for="cartItem in cart.items"
                :key="cartItem.id"
                class="flex flex-col gap-3 py-5"
              >
                <UAlert
                  v-if="getStockStatusMessage(cartItem)"
                  :color="getStockStatusMessage(cartItem)?.severity === 'error' ? 'error' : 'warning'"
                  variant="soft"
                  :icon="getStockStatusMessage(cartItem)?.severity === 'error' ? 'i-lucide-circle-x' : 'i-lucide-triangle-alert'"
                >
                  <template #title>
                    {{ getStockStatusMessage(cartItem)?.severity === 'error' ? t('stock_status.unavailable_title') : t('stock_status.limited_title') }}
                  </template>
                  <template #description>
                    <div v-if="getStockStatusMessage(cartItem)?.type === 'limited_stock'">
                      {{ t('stock_status.limited_stock', {
                        available: getStockStatusMessage(cartItem)?.available,
                        requested: getStockStatusMessage(cartItem)?.requested,
                      }) }}
                    </div>
                    <div v-else>
                      {{ t('stock_status.out_of_stock') }}
                    </div>
                  </template>
                </UAlert>

                <CartItemCard :cart-item="cartItem" />
              </li>
            </ul>

            <div class="flex flex-wrap items-center justify-between gap-3">
              <UButton
                :to="localePath('products')"
                color="neutral"
                variant="ghost"
                icon="i-lucide-chevron-left"
              >
                {{ t('continue_shopping') }}
              </UButton>
              <UButton
                color="neutral"
                variant="ghost"
                @click="() => { isConfirmingClear = true }"
              >
                {{ t('clear.cta') }}
              </UButton>
            </div>
          </template>

          <div
            v-else
            class="flex flex-col divide-y divide-default"
          >
            <div
              v-for="index in (cart?.items?.length || 2)"
              :key="index"
              class="flex gap-4 py-5"
            >
              <USkeleton class="size-24 shrink-0 rounded-xl" />
              <div class="flex flex-1 flex-col gap-3">
                <USkeleton class="h-5 w-48" />
                <USkeleton class="h-4 w-32" />
                <USkeleton class="h-8 w-32" />
              </div>
            </div>
          </div>
        </div>

        <div class="lg:sticky lg:top-24 lg:self-start">
          <CartSummary v-if="!initialLoading && cart?.items?.length" />
          <div
            v-else
            class="
              flex flex-col gap-4 rounded-[1.25rem] bg-default p-5 ring
              ring-default
            "
          >
            <USkeleton class="h-7 w-40" />
            <USkeleton class="h-5 w-full" />
            <USkeleton class="h-5 w-full" />
            <USkeleton class="h-11 w-full" />
          </div>
        </div>
      </div>

      <LazyProductSuggestions
        v-if="suggestionsEnabled && cart?.recommendations?.length"
        surface="cart"
        :items="cart.recommendations"
        hydrate-on-visible
      />
    </UContainer>

    <ClientOnly>
      <CartActionBar
        v-if="!initialLoading && cart?.items?.length"
        :total="total"
        :blocked="hasStockIssues"
      />
    </ClientOnly>

    <UModal
      v-model:open="isConfirmingClear"
      :title="t('clear.title')"
      :description="t('clear.description')"
      :dismissible="!clearing"
    >
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="clearing"
            @click="() => { isConfirmingClear = false }"
          >
            {{ t('clear.cancel') }}
          </UButton>
          <UButton
            color="error"
            variant="outline"
            icon="i-lucide-trash-2"
            :loading="clearing"
            @click="onClearCart"
          >
            {{ t('clear.confirm') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<i18n lang="yaml">
el:
  payment_lookup_failed_title: Σφάλμα επαλήθευσης πληρωμής
  payment_lookup_failed_description: Δεν μπορέσαμε να εντοπίσουμε την παραγγελία σου. Αν χρεώθηκες, θα λάβεις email επιβεβαίωσης — αλλιώς επικοινώνησε με την υποστήριξη.
  shopping_cart: Καλάθι Αγορών
  title: Το καλάθι σου
  items_in_cart: "{count} προϊόν | {count} προϊόντα"
  free_delivery_unlocked: δωρεάν μεταφορικά
  continue_shopping: Συνέχεια αγορών
  empty:
    title: Το καλάθι σου είναι άδειο
    description: Συνέχεια
    description_long: Δεν έχεις προσθέσει ακόμα προϊόντα στο καλάθι σου
  clear:
    cta: Άδειασμα καλαθιού
    title: Να αδειάσει το καλάθι;
    description: Θα αφαιρεθούν όλα τα προϊόντα από το καλάθι σου.
    cancel: Άκυρο
    confirm: Άδειασμα καλαθιού
    error_title: Το καλάθι δεν άδειασε
    error_description: Δοκίμασε ξανά σε λίγο.
  stock_status:
    out_of_stock: Το προϊόν δεν είναι διαθέσιμο
    limited_stock: "Διαθέσιμα μόνο {available} τεμάχια (έχετε {requested} στο καλάθι)"
    unavailable_title: Μη Διαθέσιμο
    limited_title: Περιορισμένη Διαθεσιμότητα
  stock_alert:
    title: Προβλήματα Διαθεσιμότητας
  recovered:
    title: Καλωσόρισες πίσω!
    description: Κρατήσαμε το καλάθι σου. Έλεγξε τα προϊόντα πριν κάποια εξαντληθούν.
en:
  payment_lookup_failed_title: Could not verify the payment
  payment_lookup_failed_description: We could not find your order. If you were charged you will get a confirmation email — otherwise please contact support.
  shopping_cart: Shopping Cart
  title: Your cart
  items_in_cart: "{count} item | {count} items"
  free_delivery_unlocked: free delivery unlocked
  continue_shopping: Continue shopping
  empty:
    title: Your cart is empty
    description: Keep shopping
    description_long: You have not added anything to your cart yet
  clear:
    cta: Empty cart
    title: Empty your cart?
    description: Every item will be removed from your cart.
    cancel: Cancel
    confirm: Empty cart
    error_title: The cart could not be emptied
    error_description: Try again in a moment.
  stock_status:
    out_of_stock: This product is unavailable
    limited_stock: "Only {available} in stock (you have {requested} in your cart)"
    unavailable_title: Unavailable
    limited_title: Limited Stock
  stock_alert:
    title: Stock Problems
  recovered:
    title: Welcome back
    description: We kept your cart. Check the items before any of them sell out.
</i18n>
