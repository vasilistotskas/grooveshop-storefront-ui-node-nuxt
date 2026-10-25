/**
 * Opens an order's PDF invoice in a new tab.
 *
 * The invoice is a short-lived signed link, so it is asked for on the
 * click. The tab opens BEFORE the request, while the click still counts
 * as the shopper's: opened after it, Safari blocks it as a pop-up. It
 * cannot be `noopener` (that hands back no window to point at the link),
 * so the opener is cut by hand.
 *
 * A guest's order is identified by its `uuid` (the confirmation link's),
 * which the invoice route forwards to Django; a signed-in shopper's by
 * their session. The caller says what went wrong in its own words:
 * `open` resolves to `missing` when Django has no invoice yet, and to
 * `failed` with the error when the request failed, for the caller to tell
 * the shopper Django's reason (`useApiError().notify`).
 */
export type OrderInvoiceOutcome
  = | { kind: 'opened' }
    | { kind: 'missing' }
    | { kind: 'busy' }
    | { kind: 'failed', error: unknown }

export function useOrderInvoice() {
  const fetching = ref(false)

  async function open(orderId: number, uuid?: string): Promise<OrderInvoiceOutcome> {
    if (fetching.value) return { kind: 'busy' }
    fetching.value = true
    const tab = window.open('', '_blank')
    if (tab) tab.opener = null
    try {
      const data = await $api(`/api/orders/${orderId}/invoice`, {
        method: 'GET',
        query: uuid ? { uuid } : undefined,
      })
      if (!data?.downloadUrl) {
        tab?.close()
        return { kind: 'missing' }
      }
      if (tab) tab.location.href = data.downloadUrl
      else window.location.assign(data.downloadUrl)
      return { kind: 'opened' }
    }
    catch (error) {
      tab?.close()
      log.error({ action: 'order:invoice:download', error })
      return { kind: 'failed', error }
    }
    finally {
      fetching.value = false
    }
  }

  return { fetching, open }
}
