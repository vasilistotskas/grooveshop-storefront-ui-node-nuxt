<script lang="ts" setup>
/**
 * The cart drawer, as the boards draw it: a slideover on a desktop, a
 * bottom sheet on a phone (`useCartDrawer().desktop`). "Cart {n}", the
 * line just added when an add opened it, the free-delivery meter, the
 * lines as compact rows, a "finishing touch" from the cart's own
 * recommendations, and the subtotal after offers with "View cart" and
 * "Checkout".
 *
 * Mounted by the redesign's header once it is first opened, so a page
 * nobody opens a cart on never loads it. The suggestions follow the cart
 * page's rule: the plan flag AND the store's setting.
 */
const { t, n, locale } = useI18n()
const localePath = useLocalePath()
const { open, added, desktop, close } = useCartDrawer()
const cartStore = useCartStore()
const { cart, loaded, hasStockIssues } = storeToRefs(cartStore)
const tenantStore = useTenantStore()
const suggestionsSetting = useSettingFlag('PRODUCT_SUGGESTIONS_ENABLED', { fallback: false })

const items = computed(() => cart.value?.items ?? [])
const count = computed(() => Number(cart.value?.totalItems ?? 0))

/** The subtotal after the cart's offers, as checkout starts from it. */
const subtotal = computed(() => Math.max(0, (cart.value?.totalPrice ?? 0) - (cart.value?.promotionDiscount ?? 0)))

const appliedNote = computed(() => {
  const codes = cart.value?.appliedCouponCodes ?? []
  const gifts = (cart.value?.promotionGiftItems ?? []).length > 0
  if (codes.length && gifts) return t('applied.code_and_gift', { codes: codes.join(', ') })
  if (codes.length) return t('applied.code', { codes: codes.join(', ') })
  if (gifts) return t('applied.gift')
  if ((cart.value?.promotionDiscount ?? 0) > 0) return t('applied.offers')
  return ''
})

/** At most two suggestions: the drawer is a glance, the cart page has the strip. */
const suggestions = computed(() => tenantStore.recommendationsEnabled && suggestionsSetting.value
  ? (cart.value?.recommendations ?? []).slice(0, 2)
  : [])

const nameOf = (product: Product) => extractTranslated(product, 'name', locale.value) ?? ''

// "View cart", "Checkout" and a product link all navigate; the drawer
// would otherwise stay open over the next page.
const route = useRoute()
watch(() => route.fullPath, () => close())

// Nuxt resolves these literal names to the components at build time.
const USlideover = resolveComponent('USlideover')
const UDrawer = resolveComponent('UDrawer')
</script>

<template>
  <component
    :is="desktop ? USlideover : UDrawer"
    v-model:open="open"
    :title="count ? t('title_count', { count }, count) : t('title')"
    :description="t('description')"
    v-bind="desktop ? { side: 'right' } : { direction: 'bottom', handle: true }"
    :ui="{ content: desktop ? 'max-w-md' : 'max-h-[92dvh]',
           body: `
             flex flex-col gap-4 p-4
             sm:p-6
           `,
           header: `hidden`,
           footer: `
             flex-col items-stretch gap-3 border-t border-default bg-muted p-4
             sm:px-6
           ` }"
  >
    <template #body>
      <div class="flex items-center justify-between gap-3">
        <!-- What the boards draw; the dialog's own (hidden) title names
             it for a screen reader, count included. -->
        <p
          aria-hidden="true"
          class="flex items-baseline gap-2 font-display text-2xl font-bold text-highlighted"
        >
          {{ t('title') }}
          <span
            v-if="count"
            class="text-base font-medium text-toned"
          >{{ count }}</span>
        </p>
        <UButton
          :aria-label="t('close')"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          square
          @click="close"
        />
      </div>

      <UAlert
        v-if="added"
        :title="t('added', { name: added })"
        icon="i-lucide-check"
        color="success"
        variant="soft"
      />

      <div
        v-if="!loaded"
        class="flex flex-col gap-3"
      >
        <USkeleton
          v-for="index in 2"
          :key="index"
          class="h-20 rounded-[0.75rem]"
        />
      </div>

      <div
        v-else-if="!items.length"
        class="flex flex-col items-start gap-3 py-6"
      >
        <p class="text-toned">
          {{ t('empty') }}
        </p>
        <UButton
          :label="t('continue')"
          :to="localePath('products')"
          color="neutral"
          variant="outline"
        />
      </div>

      <template v-else>
        <!-- The gross total, as checkout quotes delivery on it
             (`orderValueAmount`) and every other meter reads it. -->
        <ShippingFreeShippingNotice :cart-total="cart?.totalPrice ?? 0" />

        <ul class="flex flex-col divide-y divide-default">
          <li
            v-for="item in items"
            :key="item.id"
            class="py-4 first:pt-0"
          >
            <CartItemCard
              :cart-item="item"
              compact
            />
          </li>
        </ul>

        <section
          v-if="suggestions.length"
          class="flex flex-col gap-3"
        >
          <h3 class="text-sm font-semibold text-highlighted">
            {{ t('finishing_touch') }}
          </h3>
          <ul class="flex flex-col gap-3">
            <li
              v-for="product in suggestions"
              :key="product.id"
              class="flex items-center gap-3"
            >
              <ImgWithFallback
                :src="product.mainImagePath"
                :alt="nameOf(product)"
                :width="52"
                :height="52"
                fit="cover"
                loading="lazy"
                densities="x1 x2"
                class="size-13 shrink-0 rounded-[0.625rem] bg-elevated object-cover"
              />
              <div class="flex min-w-0 flex-1 flex-col">
                <span class="line-clamp-1 text-sm font-medium text-highlighted">{{ nameOf(product) }}</span>
                <span class="font-mono text-sm font-bold text-highlighted">{{ n(product.finalPrice, 'currency') }}</span>
              </div>
              <ButtonProductAddToCart
                :product="product"
                :text="t('add_named', { name: nameOf(product) })"
                icon="i-lucide-plus"
                color="neutral"
                size="sm"
                icon-only
              />
            </li>
          </ul>
        </section>
      </template>
    </template>

    <template
      v-if="items.length"
      #footer
    >
      <div class="flex items-baseline justify-between gap-3">
        <span class="font-semibold text-highlighted">{{ t('subtotal') }}</span>
        <span class="font-mono text-lg font-bold text-highlighted">{{ n(subtotal, 'currency') }}</span>
      </div>
      <p
        v-if="appliedNote"
        class="-mt-2 text-xs text-toned"
      >
        {{ appliedNote }}
      </p>
      <div class="grid grid-cols-[1fr_1.4fr] gap-2">
        <UButton
          :label="t('view_cart')"
          :to="localePath('cart')"
          color="neutral"
          variant="outline"
          size="lg"
          block
        />
        <!-- Blocked like the cart summary's: checkout sends a cart with a
             stock problem straight back to the cart. -->
        <UButton
          :label="hasStockIssues ? t('fix_stock_issues_first') : t('checkout')"
          :to="localePath('checkout')"
          :disabled="hasStockIssues"
          :color="hasStockIssues ? 'warning' : 'secondary'"
          icon="i-lucide-lock"
          size="lg"
          block
        />
      </div>
    </template>
  </component>
</template>

<i18n lang="yaml">
el:
  title: Καλάθι
  title_count: "Καλάθι, {count} προϊόν | Καλάθι, {count} προϊόντα"
  description: Τα προϊόντα στο καλάθι σου
  close: Κλείσιμο
  added: "Προστέθηκε: {name}"
  empty: Το καλάθι σου είναι άδειο.
  continue: Συνέχεια αγορών
  finishing_touch: Η τελευταία πινελιά
  add_named: Προσθήκη του «{name}» στο καλάθι
  subtotal: Υποσύνολο
  view_cart: Καλάθι
  checkout: Ολοκλήρωση
  fix_stock_issues_first: Διόρθωσε τα προβλήματα
  applied:
    code_and_gift: Εφαρμόστηκαν το κουπόνι {codes} και το δώρο
    code: Εφαρμόστηκε το κουπόνι {codes}
    gift: Το δώρο σου είναι στο καλάθι
    offers: Οι προσφορές σου έχουν εφαρμοστεί
en:
  title: Cart
  title_count: "Cart, {count} item | Cart, {count} items"
  description: The items in your cart
  close: Close
  added: "Added: {name}"
  empty: Your cart is empty.
  continue: Continue shopping
  finishing_touch: Add the finishing touch
  add_named: Add “{name}” to the cart
  subtotal: Subtotal
  view_cart: View cart
  checkout: Checkout
  fix_stock_issues_first: Fix the problems first
  applied:
    code_and_gift: Coupon {codes} and free gift applied
    code: Coupon {codes} applied
    gift: Your free gift is in the cart
    offers: Your offers are applied
</i18n>
