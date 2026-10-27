import * as z from 'zod'

/** A gift card the shopper put on the order: its code and what it can still pay. */
export interface AppliedGiftCard {
  code: string
  balance: number
}

/**
 * The checkout's "have a gift card?" field, apart from its drawing
 * (`Checkout/GiftCardInput` and the tenants' own): a code is checked
 * against Django (`/api/giftcard/check`), and only a redeemable card with
 * a balance is handed on (`onApplied`); the order holds at most
 * `maxCards`, and a code already on it is refused. Every refusal is one
 * line under the field (`cardError`), in the words of `t('errors.*')` or
 * Django's own reason.
 */
export function useGiftCardInput(options: {
  appliedCards: () => AppliedGiftCard[]
  t: ReturnType<typeof useI18n>['t']
  onApplied: (card: AppliedGiftCard) => void
}) {
  const { t } = options

  const maxCards = 3

  const cardSchema = z.object({
    code: z
      .string({ error: t('validation.required') })
      .trim()
      .min(6, { error: t('validation.too_short') })
      .max(32, { error: t('validation.too_long') }),
  })

  const formState = reactive({ code: '' })
  const submitting = ref(false)
  const cardError = ref<string | null>(null)

  async function applyCard() {
    cardError.value = null
    const code = formState.code.trim().toUpperCase()
    const applied = options.appliedCards()
    if (applied.some(card => card.code === code)) {
      cardError.value = t('errors.already_applied')
      return
    }
    if (applied.length >= maxCards) {
      cardError.value = t('errors.too_many', { max: maxCards })
      return
    }
    submitting.value = true
    try {
      const check = await $api('/api/giftcard/check', {
        method: 'POST',
        body: { code },
      })
      const balance = Number(check.balance)
      if (!check.isRedeemable || balance <= 0) {
        cardError.value = t('errors.not_redeemable')
        return
      }
      options.onApplied({ code: check.code, balance })
      formState.code = ''
    }
    catch (error) {
      cardError.value = describeApiError(error, { fallback: t('errors.invalid') }).description
    }
    finally {
      submitting.value = false
    }
  }

  return { maxCards, cardSchema, formState, submitting, cardError, applyCard }
}
