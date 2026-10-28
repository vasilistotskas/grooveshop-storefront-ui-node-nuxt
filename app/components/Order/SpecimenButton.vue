<script setup lang="ts">
/**
 * The watermarked specimen receipt of a demo store's order, offered next
 * to the real receipt. It is not a tax document, so the label says so.
 * Django builds the PDF on the request and answers 403, 404 or 429
 * instead when it will not, so the button fetches the file, saves it and
 * names a refusal in a toast, rather than navigating to an error page.
 *
 * A guest's order is identified by its `uuid` (the confirmation link's),
 * a signed-in shopper's by their session. Shared by both component
 * trees; each page decides whether to mount it from
 * `OrderDetail.hasSpecimenReceipt`.
 */
const props = defineProps<{
  orderId: number
  uuid?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'outline' | 'ghost'
}>()

const { t } = useStoreI18n('components/Order/SpecimenButton')
const { notify } = useApiError()

const fetching = ref(false)

async function download() {
  fetching.value = true
  try {
    const pdf = await $api<Blob>(`/api/orders/${props.orderId}/specimen`, {
      method: 'GET',
      query: props.uuid ? { uuid: props.uuid } : undefined,
      responseType: 'blob',
    })
    const url = URL.createObjectURL(pdf)
    const link = document.createElement('a')
    link.href = url
    link.download = `specimen-${props.orderId}.pdf`
    link.click()
    // After the click: the browser reads the blob once the download starts.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  catch (error) {
    log.error({ action: 'order:specimen:download', error })
    const status = (error as { statusCode?: number }).statusCode
    notify('order:specimen', error, {
      title: t('error_title'),
      fallback: isRateLimitedClientError(error)
        ? t('error_rate_limited')
        : status === 404 ? t('error_missing') : t('error_description'),
    })
  }
  finally {
    fetching.value = false
  }
}
</script>

<template>
  <UButton
    :label="t('cta')"
    :aria-label="t('cta')"
    :loading="fetching"
    icon="i-lucide-file-down"
    color="neutral"
    :variant="variant ?? 'outline'"
    :size="size ?? 'sm'"
    @click="download"
  />
</template>

<i18n lang="yaml">
el:
  cta: Δείγμα απόδειξης (όχι φορολογικό παραστατικό)
  error_title: Το δείγμα δεν κατέβηκε
  error_description: Δοκίμασε ξανά σε λίγο.
  error_missing: Το δείγμα δεν είναι διαθέσιμο για αυτή την παραγγελία.
  error_rate_limited: Πολλές αιτήσεις. Δοκίμασε ξανά σε ένα λεπτό.
en:
  cta: Specimen receipt (not a tax document)
  error_title: The specimen did not download
  error_description: Please try again in a moment.
  error_missing: The specimen is not available for this order.
  error_rate_limited: Too many requests. Try again in a minute.
</i18n>
