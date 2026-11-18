/** A pay way as the payment step lists it, before the quote prices it. */
interface PayWayOptionBase {
  /** The pay way's id. */
  value: number
  name: string
  /** The products value its configuration waives the fee at; 0 for none. */
  freeThreshold: number
}

/**
 * The payment step's pay ways with what each costs this cart: the fee
 * the checkout quote prices it at (`payWays[]`: Django's
 * `calculate_payment_method_fee`, already 0 when `waived`), never
 * worked out here. A pay way the quote has no row for (not answered yet,
 * or refused) shows no fee, rather than a guessed one.
 *
 * - `label`: the name with the fee, as the webside step draws it; a fee of
 *   0 adds nothing, so "(+0,00 €)" never reads as a charge.
 * - `cost`: the fee, for the default step, which draws it apart.
 * - `freeThresholdHint`: while a fee is charged, the threshold that would
 *   waive it, next to the charge it explains.
 */
export function useQuotedPayWayOptions<T extends PayWayOptionBase>(
  options: MaybeRefOrGetter<T[]>,
  quote: MaybeRefOrGetter<Pick<CartQuote, 'payWays'> | null>,
) {
  const { $i18n } = useNuxtApp()
  const t = $i18n.t.bind($i18n)
  const n = $i18n.n.bind($i18n)

  return computed(() => {
    const quoted = toValue(quote)?.payWays ?? []
    return toValue(options).map((option) => {
      const cost = quoted.find(row => row.id === option.value)?.fee ?? 0
      return {
        ...option,
        label: cost > 0 ? `${option.name} (+${n(cost, 'currency')})` : option.name,
        cost,
        freeThresholdHint: cost > 0 && option.freeThreshold > 0
          ? t('pay_way_free_above', { amount: n(option.freeThreshold, 'currency') })
          : '',
      }
    })
  })
}
