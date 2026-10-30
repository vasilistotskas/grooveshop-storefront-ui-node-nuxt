/**
 * "Available coupons (x)": the coupons this cart can use, pre-judged,
 * apart from their drawing (`Checkout/CouponPicker` and the tenants' own).
 *
 * Django returns every coupon the shopper may be offered (the ones the
 * store advertises, plus the personal ones assigned to a signed-in
 * customer) with the verdict `CouponService.apply` would give for the
 * cart as it stands, so a disabled row and a refusal on apply can never
 * disagree. The count on the trigger is the ELIGIBLE coupons only: a
 * number counting codes the shopper cannot use would be a broken promise
 * before the list opens.
 *
 * The list is never rendered on the server: every field but the offer
 * copy depends on this cart and this shopper, so a server render would put
 * one customer's verdicts into a shared payload. It is re-judged whenever
 * the basket changes value or contents, since a coupon blocked on a
 * minimum subtotal becomes usable the moment the shopper adds one more
 * item. `successIcon` is the success toast's, for the drawing that dresses
 * its toasts; `onApplied` runs once a code is on the cart. Call it where
 * `await` is allowed: the request is returned awaited.
 */
export async function useCouponPicker(options: {
  t: ReturnType<typeof useI18n>['t']
  successIcon: string
  onApplied: (code: string) => void
}) {
  const { t } = options
  const { $i18n } = useNuxtApp()
  const toast = useToast()
  const { notify, describe } = useApiError()
  const cartStore = useCartStore()
  const { cart } = storeToRefs(cartStore)
  const { rejectionMessage } = usePromotionOffer()

  const open = ref(false)
  const submitting = ref<string | null>(null)

  const { data: coupons, refresh: refreshCoupons } = await useApi(
    '/api/cart/coupons',
    {
      key: 'cart-coupons',
      server: false,
      default: () => [],
      watch: [
        () => cart.value?.totalPrice,
        () => cart.value?.totalItems,
        () => cart.value?.appliedCouponCodes?.join(','),
      ],
    },
  )

  const rows = computed(() => coupons.value ?? [])
  const eligibleCount = computed(
    () => rows.value.filter(row => row.eligible && !row.applied).length,
  )
  // With nothing to claim the list is still worth opening (to see why a
  // code does not apply, or to find the one already on the cart), so the
  // label drops the number instead of the button disappearing.
  const triggerLabel = computed(() =>
    eligibleCount.value > 0
      ? t('trigger', { count: eligibleCount.value })
      : t('trigger_none'),
  )

  function savingLabel(row: CartCoupon): string | null {
    if (row.applied) return null
    const amount = Number(row.discountAmount ?? 0)
    if (amount > 0) return `-${$i18n.n(amount, 'currency')}`
    if (row.freeShipping) return t('free_shipping')
    return null
  }

  async function applyCoupon(row: CartCoupon) {
    submitting.value = row.code
    try {
      cartStore.setCart(await $api('/api/cart/coupon', {
        method: 'POST',
        body: { code: row.code },
      }))
      // The cart now carries the code, which re-judges the list (its `watch`).
      open.value = false
      options.onApplied(row.code)
      toast.add({
        title: t('applied_title'),
        description: row.promotion.name,
        color: 'success',
        icon: options.successIcon,
      })
    }
    catch (error) {
      // Django answers 400 with { detail, reason } from the ACP discount
      // vocabulary. Reaching here means the cart moved between the
      // verdict and the click, so re-read rather than just complaining.
      notify('coupon:apply', error, {
        title: t('apply_failed'),
        reason: rejectionMessage(describe(error).code),
      })
      await refreshCoupons()
    }
    finally {
      submitting.value = null
    }
  }

  return { open, submitting, rows, eligibleCount, triggerLabel, savingLabel, applyCoupon }
}
