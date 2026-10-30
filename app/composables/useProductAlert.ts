import * as z from 'zod'

/** A toast's words and icon, in the drawing's own voice. */
export interface ProductAlertToast {
  title: string
  description?: string
  icon?: string
}

/**
 * A product's "notify me" alerts, apart from their drawing
 * (`Product/NotifyMe` and the tenants' own): the shopper's active alert of
 * the chosen `kind`, the form that creates one, and the way to turn it
 * off.
 *
 * Two independent kinds: `restock` (the product is back in stock) and
 * `price_drop` (its price reached the shopper's target). Django holds one
 * active alert per kind, sends one email and switches it off. A signed-in
 * shopper's active alert replaces the form, so they are never asked to
 * subscribe again into a 409; guests are not looked up, as they cannot be
 * identified before they give an email, and only a guest sends one (Django
 * ties a signed-in shopper's alert to their account). A price target must
 * be below `currentPrice`, or the alert would fire at once.
 *
 * Django answers a signed-in shopper with 201 and the alert, active at
 * once. A guest always gets 202 and a `detail`, whatever the address:
 * nothing is active until they press the link emailed to them (double
 * opt-in, `pages/alerts/confirm/[token].vue`), so the answer is told by
 * its body (only an alert has an `id`) and the drawing says `pending`
 * ("check your inbox") instead of `created`.
 *
 * `messages` are the drawing's own toasts and failure headlines;
 * `onCreated` runs once Django has answered (the drawing closes its
 * dialog). A 409 means the alert exists already: it is read so the
 * drawing shows it.
 * Call it where `await` is allowed: the lookup is read before it returns.
 */
export async function useProductAlert(options: {
  productId: () => number
  kind: () => ProductAlertKindEnum
  currentPrice: () => number | null | undefined
  t: ReturnType<typeof useI18n>['t']
  messages: () => {
    created: ProductAlertToast
    pending: ProductAlertToast
    conflict: ProductAlertToast
    cancelled: ProductAlertToast
    createError: DescribeApiErrorOptions
    cancelError: DescribeApiErrorOptions
  }
  onCreated: () => void
}) {
  const { t } = options
  const toast = useToast()
  const { notify } = useApiError()
  const { loggedIn } = useUserSession()

  const submitting = ref(false)
  const canceling = ref(false)

  const isPriceDrop = computed(() => options.kind() === 'price_drop')

  const schema = computed(() => {
    const email = loggedIn.value
      ? z.email({ error: t('validation.email.valid') }).optional().or(z.literal(''))
      : z.email({ error: t('validation.email.valid') })
    if (!isPriceDrop.value) return z.object({ email })

    const currentPrice = options.currentPrice()
    const cap = typeof currentPrice === 'number' && currentPrice > 0
      ? currentPrice
      : Number.POSITIVE_INFINITY
    return z.object({
      email,
      // Coerce handles the empty-string → number hop that <input
      // type="number"> sends when the user clears the field.
      targetPrice: z.coerce
        .number({ error: t('price_drop.validation.required') })
        .positive({ error: t('price_drop.validation.positive') })
        .max(cap, { error: t('price_drop.validation.below_current') }),
    })
  })

  const state = reactive<{ email: string, targetPrice: number | undefined }>({
    email: '',
    targetPrice: undefined,
  })

  const { data: activeAlerts, refresh: refreshAlerts } = await useAsyncData<ProductAlert[]>(
    `product-alerts:${options.productId()}`,
    async () => {
      if (!loggedIn.value) return []
      try {
        const response = await $api('/api/products/alerts', {
          method: 'GET',
          query: { product: options.productId(), isActive: true, pageSize: 2 },
        })
        return response?.results ?? []
      }
      catch (error) {
        log.warn({ tag: 'product:notify-me', message: 'lookup failed', error })
        return []
      }
    },
    { watch: [loggedIn], default: () => [] },
  )

  const activeAlert = computed(() => activeAlerts.value.find(alert => alert.kind === options.kind()))

  async function onSubmit() {
    if (submitting.value) return
    submitting.value = true
    try {
      const response = await $api('/api/products/alerts', {
        method: 'POST',
        body: {
          kind: options.kind(),
          product: options.productId(),
          ...(loggedIn.value ? {} : { email: state.email }),
          ...(isPriceDrop.value ? { targetPrice: state.targetPrice } : {}),
        },
      })
      if ('id' in response) {
        toast.add({ ...options.messages().created, color: 'success' })
        options.onCreated()
        await refreshAlerts()
      }
      else {
        toast.add({ ...options.messages().pending, color: 'info' })
        options.onCreated()
      }
    }
    catch (error) {
      const status = (error as { statusCode?: number })?.statusCode
      log.warn({ tag: 'product:notify-me', message: 'create failed', kind: options.kind(), status, error })
      // Django says the alert exists — read it so the drawing shows it.
      if (status === 409) {
        toast.add({ ...options.messages().conflict, color: 'warning' })
        await refreshAlerts()
      }
      else {
        notify('notify-me:create', error, options.messages().createError)
      }
    }
    finally {
      submitting.value = false
    }
  }

  async function cancelAlert() {
    const alert = activeAlert.value
    if (!alert || canceling.value) return
    canceling.value = true
    try {
      await $api(`/api/products/alerts/${alert.id}`, { method: 'DELETE' })
      toast.add({ ...options.messages().cancelled, color: 'success' })
      await refreshAlerts()
    }
    catch (error) {
      log.warn({ tag: 'product:notify-me', message: 'cancel failed', kind: options.kind(), error })
      notify('notify-me:cancel', error, options.messages().cancelError)
    }
    finally {
      canceling.value = false
    }
  }

  return { schema, state, submitting, canceling, isPriceDrop, activeAlert, onSubmit, cancelAlert }
}
