import type { Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js'

/**
 * Buying a gift card: the amounts the store sells (its settings), the
 * card processors it takes the payment through, the purchase request,
 * and the card payment in place when the processor answers with a
 * client secret (a hosted processor sends the buyer to its own page).
 *
 * Shared by every drawing of the page (`Storefront/GiftCards.vue` and the
 * frozen webside copy); each keeps its own form, steps and copy. The error
 * lines are the calling page's `errors.*` messages. Call it from the
 * body's `<script setup>`.
 */
export interface GiftCardPurchaseForm {
  amount: number | undefined
  buyerEmail: string
  recipientEmail: string
  recipientName: string
  senderName: string
  message: string
}

export interface GiftCardPurchaseInputs {
  /** The page's form, read when the purchase starts. */
  form: GiftCardPurchaseForm
  /** When to email the card (ISO); left out, Django sends it right after payment. */
  deliverAt?: MaybeRefOrGetter<string | undefined>
  /** The card payment went through. */
  onPaid: () => void
}

// The card processors a gift card can be paid through, primary first.
// Typed by the generated enum (Django's payment registry), so a provider
// Django drops fails the build here instead of matching nothing.
const GIFT_CARD_PROVIDERS: readonly PaymentProviderEnum[] = [
  zPaymentProviderEnum.enum.viva_wallet,
  zPaymentProviderEnum.enum.stripe,
]

export function useGiftCardPurchase({ form, deliverAt, onPaid }: GiftCardPurchaseInputs) {
  const { t } = useI18n()
  const tenantStore = useTenantStore()

  // Purchase bounds are the store's settings, as Django resolves them. A
  // bound that could not be read is left to Django, which validates the
  // amount anyway.
  const minSetting = useSettingValue('GIFT_CARD_MIN_AMOUNT')
  const maxSetting = useSettingValue('GIFT_CARD_MAX_AMOUNT')
  const minAmount = computed(() => giftCardAmountBound(minSetting.value))
  const maxAmount = computed(() => giftCardAmountBound(maxSetting.value))
  const validitySetting = useSettingValue('GIFT_CARD_VALIDITY_DAYS')
  const validityDays = computed(() => giftCardValidityDays(validitySetting.value))

  // Which processors the store offers comes from its pay-way list, so a
  // merchant who disables a provider hides it here too.
  const { data: payWays } = useLazyAsyncData(
    'gift-cards:pay-ways',
    () => $api<Pagination<PayWay>>('/api/pay-way', {
      method: 'GET',
      headers: useRequestHeaders(),
    }).catch(() => null),
    { default: () => null },
  )
  const availableProviders = computed(() => {
    const codes = new Set(
      (payWays.value?.results ?? [])
        .filter(payWay => payWay.settlement === 'online' && payWay.active)
        .map(payWay => payWay.providerCode ?? ''),
    )
    if (!tenantStore.stripePublishableKey) {
      codes.delete(zPaymentProviderEnum.enum.stripe)
    }
    return GIFT_CARD_PROVIDERS.filter(code => codes.has(code))
  })
  const selectedProvider = ref<PaymentProviderEnum | undefined>(undefined)
  watch(availableProviders, (providers) => {
    if (!selectedProvider.value || !providers.includes(selectedProvider.value)) {
      selectedProvider.value = providers[0]
    }
  }, { immediate: true })

  const step = ref<'form' | 'payment' | 'success'>('form')
  const submitting = ref(false)
  const purchaseError = ref<string | null>(null)
  const clientSecret = ref<string | null>(null)
  const purchasedAmount = ref(0)
  const recipientEmailDisplay = ref('')

  const startPurchase = async () => {
    if (!selectedProvider.value) {
      purchaseError.value = t('errors.no_provider')
      return
    }
    purchaseError.value = null
    submitting.value = true
    try {
      const response = await $api<{
        purchaseUuid: string
        provider: string
        clientSecret?: string
        paymentIntentId?: string
        checkoutUrl?: string
        amount: string | number
        currency: string
      }>('/api/giftcard/purchase', {
        method: 'POST',
        body: {
          amount: form.amount,
          buyerEmail: form.buyerEmail,
          recipientEmail: form.recipientEmail,
          recipientName: form.recipientName || undefined,
          senderName: form.senderName || undefined,
          message: form.message || undefined,
          deliverAt: toValue(deliverAt),
          paymentProvider: selectedProvider.value,
        },
      })

      // Viva Smart Checkout is a hosted redirect — the buyer pays on
      // Viva's page and returns via /checkout/viva-return, which lands
      // on /gift-cards/success for status polling.
      if (response.checkoutUrl) {
        window.location.assign(response.checkoutUrl)
        return
      }

      clientSecret.value = response.clientSecret ?? null
      purchasedAmount.value = Number(response.amount)
      recipientEmailDisplay.value = form.recipientEmail
      step.value = 'payment'
    }
    catch (error: any) {
      purchaseError.value
        = describeApiError(error, { fallback: t('errors.purchase_failed') }).description
    }
    finally {
      submitting.value = false
    }
  }

  // ── Stripe card confirmation (lean clone of StripePayment.vue) ──────
  const stripe = ref<Stripe | null>(null)
  const elements = ref<StripeElements | null>(null)
  const cardElement = ref<StripeCardElement | null>(null)
  /** The element the card field mounts into (`ref="cardElementRef"`). */
  const cardElementRef = ref<HTMLElement>()
  const isCardComplete = ref(false)
  const cardError = ref('')
  const paying = ref(false)

  const initializeStripe = async () => {
    if (!cardElementRef.value || stripe.value) return
    try {
      const { onLoaded } = useScriptStripe()
      onLoaded(({ Stripe }) => {
        try {
          stripe.value = Stripe(tenantStore.stripePublishableKey)
          elements.value = stripe.value!.elements()
          cardElement.value = elements.value.create('card', {
            style: { base: { fontSize: '16px' } },
          })
          cardElement.value.mount(cardElementRef.value!)
          cardElement.value.on('change', (event) => {
            isCardComplete.value = event.complete
            cardError.value = event.error ? event.error.message : ''
          })
        }
        catch (err) {
          log.error({ action: 'giftcard:stripeInit', error: err })
          cardError.value = t('errors.stripe_init')
        }
      })
    }
    catch (err) {
      log.error({ action: 'giftcard:stripeSetup', error: err })
      cardError.value = t('errors.stripe_init')
    }
  }

  watch(cardElementRef, (newRef) => {
    if (newRef && !stripe.value) {
      nextTick(() => initializeStripe())
    }
  })

  const confirmPayment = async () => {
    if (!stripe.value || !cardElement.value || !clientSecret.value) return
    paying.value = true
    cardError.value = ''
    try {
      const result = await stripe.value.confirmCardPayment(clientSecret.value, {
        payment_method: {
          card: cardElement.value,
          billing_details: {
            name: form.senderName || undefined,
            email: form.buyerEmail,
          },
        },
      })
      if (result.error) {
        cardError.value = result.error.message || t('errors.payment_failed')
        return
      }
      step.value = 'success'
      onPaid()
    }
    catch (error) {
      log.error({ action: 'giftcard:confirmPayment', error })
      cardError.value = t('errors.payment_failed')
    }
    finally {
      paying.value = false
    }
  }

  return {
    minAmount,
    maxAmount,
    validityDays,
    availableProviders,
    selectedProvider,
    step,
    submitting,
    purchaseError,
    purchasedAmount,
    recipientEmailDisplay,
    startPurchase,
    cardElementRef,
    isCardComplete,
    cardError,
    paying,
    confirmPayment,
  }
}
