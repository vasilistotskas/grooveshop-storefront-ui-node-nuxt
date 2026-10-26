/**
 * What Django asks the shopper to type before it schedules the deletion of
 * the account: the literal `DELETE`
 * (`DeleteAccountRequestSerializer.validate_confirmation`,
 * `user/serializers/account.py`; any other text is answered with the
 * `delete_confirmation_mismatch` code).
 */
export const DELETE_ACCOUNT_CONFIRMATION = 'DELETE'

/** How often a data export still being made is looked at again. */
const EXPORT_POLL_MS = 3000

/**
 * The privacy page's two jobs, the same in every drawing of it:
 *
 * - the shopper's data export: the latest one (`latest`), asked for with
 *   `requestExport` (the mail with the link follows), looked at again every
 *   few seconds while it is pending or being made (`isProcessing`), and
 *   opened with `openDownload` once it is ready (`isReady`);
 * - deleting the account: a dialog (`isDeleteModalOpen`) the shopper
 *   confirms by typing `DELETE` (`canConfirmDelete`); the session is
 *   cleared and the shopper goes to the home page.
 *
 * `toasts` dresses the two success toasts; failures go through
 * `useApiError` under `titles`.
 */
export function useAccountPrivacy(options: {
  toasts: { exportRequested: () => ToastInput, deletionScheduled: () => ToastInput }
  titles: { exportFailed: () => string, deleteFailed: () => string }
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

  const openDownload = () => {
    const url = latest.value?.downloadUrl
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
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
