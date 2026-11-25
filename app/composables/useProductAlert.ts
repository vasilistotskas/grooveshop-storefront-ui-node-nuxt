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
 * drawing shows it. The active alert is `useProductActiveAlert`'s.
 */
export function useProductAlert(options: {
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

  const { activeAlert, reread } = useProductActiveAlert({ productId: options.productId, kind: options.kind })

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
        await reread()
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
        await reread()
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
      await reread()
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

/**
 * The signed-in shopper's active alert of `kind` on a product: what the
 * "notify me" trigger shows (set or not) and what the dialog replaces its
 * form with.
 *
 * Every reader on the page derives it from ONE list, the shopper's active
 * alerts of every kind and product, read once per page (keyed by the
 * route's path): a listing with a dozen sold-out cards sends one request,
 * not one per card, a reader that mounts later (a dialog opened, a card
 * hydrated on scroll) takes the list already read (`payloadCachedData`),
 * and a change made in a dialog shows on every trigger. Every kind in one
 * list, so the product page's price-drop alert costs no second request.
 * Guests are not looked up: they cannot be identified before they give an
 * email.
 *
 * Read in the browser, after mount (`server: false`, `lazy`): product pages
 * and listings are served from a cache that knows no shopper
 * (`shared/constants/prerender.ts`), so a server read would only ever store a
 * guest's empty list in the payload. And no reader draws an alert before it
 * has mounted: a card hydrated lazily, after another reader filled the list,
 * would otherwise draw the shopper's alert over the guest HTML it was sent.
 * A sign-in, a sign-out or another shopper reads again, and a read that
 * was on its way for the shopper before is read again for the new one.
 *
 * `reread` follows a change the shopper made (an alert created, found to
 * exist, or turned off): it cancels a read already on its way, which started
 * before the change and would answer with the list as it was.
 */
export function useProductActiveAlert(options: {
  productId: () => number
  kind: () => ProductAlertKindEnum
}) {
  const { loggedIn, user } = useUserSession()
  const route = useRoute()
  const mounted = useMounted()
  // The shopper the list is read for, from the session itself: the read
  // outlives the reader whose call registered it.
  const shopperNow = () => (loggedIn.value ? user.value?.id ?? null : null)
  const shopper = computed(shopperNow)

  async function readFor(reading: number | null): Promise<ProductAlert[]> {
    if (reading === null) return []
    try {
      const alerts: ProductAlert[] = []
      let page = 1
      let more = false
      do {
        const response = await $api('/api/products/alerts', {
          method: 'GET',
          query: { isActive: true, page, pageSize: DATA_MAX_PAGE_SIZE },
        })
        alerts.push(...response.results)
        more = Boolean(response.links?.next)
        page += 1
      } while (more)
      return alerts
    }
    catch (error) {
      log.warn({ tag: 'product:notify-me', message: 'lookup failed', error })
      return []
    }
  }

  // A change of shopper while a read is on its way joins that read (one
  // request for every reader); the read then sees the shopper changed and
  // reads again for the one signed in now, so no shopper is shown the
  // alerts of the one before.
  const { data: activeAlerts, refresh } = useAsyncData<ProductAlert[]>(
    `product-alerts:active:${route.path}`,
    async () => {
      let reading = shopperNow()
      let alerts = await readFor(reading)
      while (shopperNow() !== reading) {
        reading = shopperNow()
        alerts = await readFor(reading)
      }
      return alerts
    },
    { watch: [shopper], default: () => [], server: false, lazy: true, dedupe: 'defer', getCachedData: payloadCachedData },
  )

  const activeAlert = computed(() => (mounted.value
    ? activeAlerts.value.find(alert => alert.product === options.productId() && alert.kind === options.kind())
    : undefined))

  async function reread() {
    await refresh({ dedupe: 'cancel' })
  }

  return { activeAlert, reread }
}
