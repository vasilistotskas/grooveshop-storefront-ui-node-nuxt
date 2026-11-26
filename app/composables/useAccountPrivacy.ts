/**
 * What Django asks the shopper to type before it schedules the deletion of
 * the account: the literal `DELETE`
 * (`DeleteAccountRequestSerializer.validate_confirmation`,
 * `src/user/serializers/account.py`; any other text is answered with the
 * `delete_confirmation_mismatch` code).
 */
export const DELETE_ACCOUNT_CONFIRMATION = 'DELETE'

/**
 * The page where the shopper confirms it is them, when Django refused the
 * deletion for want of a recent confirmation; null for any other failure.
 */
function reauthenticationPathFor(error: unknown) {
  const refusal = zReauthenticationRequired.safeParse(apiErrorBodyOf(error))
  if (!refusal.success || refusal.data.code !== 'reauthentication_required') return null
  return reauthenticationPath(refusal.data.flows ?? [])
}

/** How often a data export still being made is looked at again. */
const EXPORT_POLL_MS = 3000

/**
 * The privacy page's two jobs, the same in every drawing of it:
 *
 * - the shopper's data export: the latest one (`latest`), asked for with
 *   `requestExport` (the mail with the link follows), looked at again every
 *   few seconds while it is pending or being made (`isProcessing`), and
 *   saved with `openDownload` once it is ready (`isReady`), fetched through
 *   the session so a refusal is told on this page;
 * - deleting the account: a dialog (`isDeleteModalOpen`) the shopper
 *   confirms by typing `DELETE` (`canConfirmDelete`); the session is
 *   cleared and the shopper goes to the home page. Django asks a shopper
 *   who has not confirmed it is them lately to do so first (403
 *   `reauthentication_required` with the ways this account has,
 *   `ReauthenticationRequired`): the shopper is sent to that page and
 *   back here.
 *
 * `toasts` dresses the two success toasts; failures go through
 * `useApiError` under `titles`.
 */
export function useAccountPrivacy(options: {
  toasts: { exportRequested: () => ToastInput, deletionScheduled: () => ToastInput }
  titles: {
    exportFailed: () => string
    downloadFailed: () => string
    downloadExpired: () => string
    deleteFailed: () => string
  }
}) {
  const toast = useToast()
  const { notify } = useApiError()
  const router = useRouter()
  const localePath = useLocalePath()
  const { user, loggedIn, clear: clearSession } = useUserSession()

  const uid = computed(() => user.value?.id)

  const exports = ref<UserDataExport[]>([])
  const fetchingExports = ref(false)
  const requesting = ref(false)

  const latest = computed(() => exports.value[0] ?? null)

  const isProcessing = computed(() =>
    latest.value?.status === 'pending'
    || latest.value?.status === 'processing',
  )

  const isReady = computed(() => latest.value?.status === 'ready')

  async function loadExports() {
    if (!uid.value) return
    fetchingExports.value = true
    try {
      const res = await $api(`/api/user/account/${uid.value}/data-exports`)
      exports.value = (res?.results ?? []) as UserDataExport[]
    }
    catch (error) {
      log.error({ action: 'privacy:loadExports', error })
    }
    finally {
      fetchingExports.value = false
    }
  }

  let pollHandle: ReturnType<typeof setTimeout> | null = null
  const stopPolling = () => {
    if (pollHandle) {
      clearTimeout(pollHandle)
      pollHandle = null
    }
  }
  const pollExports = () => {
    stopPolling()
    if (!isProcessing.value) return
    pollHandle = setTimeout(async () => {
      await loadExports()
      if (isProcessing.value) pollExports()
    }, EXPORT_POLL_MS)
  }

  const requestExport = async () => {
    if (!uid.value || requesting.value) return
    requesting.value = true
    try {
      await $api(`/api/user/account/${uid.value}/request-data-export`, {
        method: 'POST',
      })
      toast.add(options.toasts.exportRequested())
      await loadExports()
      pollExports()
    }
    catch (error) {
      log.error({ action: 'privacy:requestExport', error })
      notify('privacy:request-export', error, { title: options.titles.exportFailed() })
    }
    finally {
      requesting.value = false
    }
  }

  const openDownload = async () => {
    const exportId = latest.value?.id
    if (!uid.value || exportId === undefined) return
    try {
      const bundle = await $api<Blob>(
        `/api/user/account/${uid.value}/data-exports/${exportId}/download`,
        { responseType: 'blob' },
      )
      const url = URL.createObjectURL(bundle)
      const link = document.createElement('a')
      link.href = url
      link.download = `data-export-${exportId}.json`
      link.click()
      // After the click: the browser reads the blob once the download starts.
      setTimeout(() => URL.revokeObjectURL(url), 0)
    }
    catch (error) {
      log.error({ action: 'privacy:downloadExport', error })
      // A blob response holds Django's reason as a Blob, so the status names it.
      const status = (error as { statusCode?: number }).statusCode
      // The page loaded it as ready; show what it is now, with "request again".
      if (status === 410) {
        exports.value = exports.value.map(row => row.id === exportId ? { ...row, status: 'expired' } : row)
      }
      notify('privacy:download-export', error, {
        title: options.titles.downloadFailed(),
        fallback: status === 410 ? options.titles.downloadExpired() : undefined,
      })
    }
  }

  const isDeleteModalOpen = ref(false)
  const confirmText = ref('')
  const deleting = ref(false)

  const canConfirmDelete = computed(() =>
    confirmText.value === DELETE_ACCOUNT_CONFIRMATION && !deleting.value,
  )

  const onOpenModal = () => {
    confirmText.value = ''
    isDeleteModalOpen.value = true
  }

  const onConfirmDelete = async () => {
    if (!uid.value || !canConfirmDelete.value) return
    deleting.value = true
    try {
      await $api(`/api/user/account/${uid.value}/delete-account`, {
        method: 'POST',
        body: { confirmation: DELETE_ACCOUNT_CONFIRMATION },
      })
      toast.add(options.toasts.deletionScheduled())
      isDeleteModalOpen.value = false
      await clearSession()
      await router.push(localePath('index'))
    }
    catch (error) {
      const confirmFirst = reauthenticationPathFor(error)
      if (confirmFirst) {
        isDeleteModalOpen.value = false
        const next = returnTarget(router.currentRoute.value)
        await router.push({ path: localePath(confirmFirst), query: next ? { next } : undefined })
        return
      }
      log.error({ action: 'privacy:deleteAccount', error })
      notify('privacy:delete-account', error, { title: options.titles.deleteFailed() })
    }
    finally {
      deleting.value = false
    }
  }

  onMounted(async () => {
    if (!loggedIn.value) return
    await loadExports()
    if (isProcessing.value) pollExports()
  })

  onBeforeUnmount(stopPolling)

  return {
    latest,
    isProcessing,
    isReady,
    requesting,
    requestExport,
    openDownload,
    isDeleteModalOpen,
    confirmText,
    deleting,
    canConfirmDelete,
    onOpenModal,
    onConfirmDelete,
  }
}
