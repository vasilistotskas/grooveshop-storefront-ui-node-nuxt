import * as z from 'zod'

/**
 * The cart's "have a coupon code?" field, apart from its drawing
 * (`Checkout/CouponInput` and the tenants' own): the codes on the cart
 * and what each does now, the form that attaches one, and the way to take
 * them off.
 *
 * `couponRows` is Django's verdict on every attached code: the money it
 * takes off, free shipping, a gift, or why it is refused (a better
 * automatic offer won, its item left the cart, its gift ran out).
 * `promotionsEnabled` is the store's feature, and false while a wholesale
 * cart does not stack retail promotions (Django would refuse every new
 * code) unless a code is attached already, which the shopper must still
 * be able to see and remove.
 *
 * A refusal is Django's `{ detail, reason }`; the reason is the ACP
 * discount vocabulary, which the picker's verdicts read too through
 * `usePromotionOffer`, so a refusal says the same thing wherever the
 * shopper meets it. `successIcon` is the success toast's, for the drawing
 * that dresses its toasts.
 */
export function useCouponInput(options: {
  t: ReturnType<typeof useI18n>['t']
  successIcon: string
}) {
  const { t } = options
  const toast = useToast()
  const { notify } = useApiError()
  const cartStore = useCartStore()
  const { cart } = storeToRefs(cartStore)
  const { $i18n } = useNuxtApp()
  const { rejectionMessage } = usePromotionOffer()

  // A store without promotions never renders the widget.
  const promotionsFeature = useStoreFeature('promotions')
  const couponRows = computed(() => cart.value?.appliedCoupons ?? [])
  const allRefused = computed(() =>
    couponRows.value.every(row => row.rejection !== null))

  const b2bSuppressesCoupons = computed(() => {
    const b2b = cart.value?.b2bPricing
    return Boolean(b2b?.applied) && !b2b?.allowPromotions
  })
  const promotionsEnabled = computed(
    () => promotionsFeature.value
      && (!b2bSuppressesCoupons.value || couponRows.value.length > 0),
  )

  type CouponRow = Cart['appliedCoupons'][number]

  // Django accepts a code only when it changes the outcome, so a code it
  // just accepted always carries one of the three benefits.
  const appliedDescription = (row: CouponRow | undefined) => {
    if (!row) return undefined
    if (row.amount > 0) {
      return t('applied_description', { amount: $i18n.n(row.amount, 'currency') })
    }
    if (row.freeShipping) return t('applied_free_shipping')
    if (row.gift) return t('applied_gift')
    return undefined
  }

  const couponSchema = z.object({
    code: z
      .string({ error: t('validation.required') })
      .trim()
      .min(3, { error: t('validation.too_short') })
      .max(40, { error: t('validation.too_long') }),
  })

  const formState = reactive({ code: '' })
  const submitting = ref(false)
  const couponError = ref<string | null>(null)

  const applyCoupon = async () => {
    couponError.value = null
    submitting.value = true
    try {
      const code = formState.code.trim()
      // Django answers with the updated cart: no reload.
      cartStore.setCart(await $api('/api/cart/coupon', {
        method: 'POST',
        body: { code },
      }))
      formState.code = ''
      toast.add({
        title: t('applied_title'),
        description: appliedDescription(
          couponRows.value.find(row => row.code === code.toUpperCase()),
        ),
        color: 'success',
        icon: options.successIcon,
      })
    }
    catch (error) {
      const described = describeApiError(error, { fallback: rejectionMessage(null) })
      couponError.value = described.code ? rejectionMessage(described.code) : described.description
    }
    finally {
      submitting.value = false
    }
  }

  const removeCoupon = async () => {
    submitting.value = true
    try {
      cartStore.setCart(await $api('/api/cart/coupon', { method: 'DELETE' }))
      couponError.value = null
    }
    catch (error) {
      log.error({ action: 'checkout:removeCoupon', error, requestId: requestIdOf(error) })
      notify('coupon:remove', error, { title: t('remove_failed') })
    }
    finally {
      submitting.value = false
    }
  }

  return {
    promotionsEnabled,
    couponRows,
    allRefused,
    couponSchema,
    formState,
    submitting,
    couponError,
    applyCoupon,
    removeCoupon,
  }
}
