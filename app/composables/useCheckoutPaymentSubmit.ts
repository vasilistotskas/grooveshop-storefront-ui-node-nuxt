/**
 * Placing the order from the payment step: only with the terms accepted
 * (no schema covers the consent, so the gate is here), only once while
 * the order is being placed (a second tap on Pay must not place a second
 * order), and only past the step's own validation.
 *
 * Shared by every drawing of the payment step (`Checkout/StepPayment.vue`
 * and the frozen webside copy); each draws its own consent checkbox,
 * bound to `accepted`, and exposes `submit` to the page's Pay / Place
 * order button. The consent is the checkout form's `termsAccepted`,
 * which the order carries to Django.
 */
export interface CheckoutPaymentSubmitInputs {
  /** The shopper accepted the terms (the checkout form's `termsAccepted`). */
  accepted: Ref<boolean>
  /** The order is being placed. */
  isSubmitting: MaybeRefOrGetter<boolean>
  /** The step's `UForm`: validates the pay way and emits the step's `submit`. */
  form: Readonly<Ref<{ submit: () => Promise<void> } | null>>
  /** The consent checkbox's wrapper, scrolled to when it is missing. */
  consent: Readonly<Ref<HTMLElement | null>>
}

export function useCheckoutPaymentSubmit(inputs: CheckoutPaymentSubmitInputs) {
  /** Pay was tried without the terms accepted: the checkbox says so. */
  const termsMissing = ref(false)

  watch(inputs.accepted, (accepted) => {
    if (accepted) termsMissing.value = false
  })

  async function submit() {
    if (toValue(inputs.isSubmitting)) return
    if (!inputs.accepted.value) {
      termsMissing.value = true
      inputs.consent.value?.scrollIntoView({ block: 'center' })
      return
    }
    await inputs.form.value?.submit()
  }

  return { termsMissing, submit }
}
