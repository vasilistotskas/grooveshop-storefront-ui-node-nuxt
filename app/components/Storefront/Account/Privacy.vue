<script lang="ts" setup>
const { t, n, locale } = useI18n()
// Every account route rendered with the document title left at the
// store name, twice — 46 pages whose browser tab and history entry were
// indistinguishable. The `title` string was already here and simply
// never applied.
useHead({ title: () => t('title') })
const toast = useToast()
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

const statusColor = computed(() => {
  switch (latest.value?.status) {
    case 'ready': return 'success'
    case 'expired': return 'warning'
    case 'failed': return 'error'
    default: return 'neutral'
  }
})

// The same key and options as the account shell, so the two share one request.
const { data: summary } = useLazyApi<AccountSummary>('/api/user/account/summary', {
  key: 'account-summary',
  method: 'GET',
})

// What deleting the account forfeits: only the parts the shopper has.
const lostPoints = computed(() => summary.value?.loyalty?.pointsBalance || 0)
const lostBalance = computed(() => summary.value?.giftCardBalance || 0)

const forfeitTitle = computed(() => {
  const points = lostPoints.value > 0
  const balance = lostBalance.value > 0
  if (!points && !balance) return ''
  const params = { points: n(lostPoints.value), balance: n(lostBalance.value, 'currency') }
  // The points are the plural's count: "1 πόντο" / "2 πόντους".
  return t(points && balance ? 'delete.lost_both' : points ? 'delete.lost_points' : 'delete.lost_balance', params, lostPoints.value)
})

const fileSizeLabel = computed(() => {
  const bytes = latest.value?.fileSize
  if (!bytes) return ''
  const kb = bytes / 1024
  return kb < 1024
    ? `${n(kb, { maximumFractionDigits: 1 })} KB`
    : `${n(kb / 1024, { maximumFractionDigits: 2 })} MB`
})

const loadExports = async () => {
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
  }, 3000)
}

const requestExport = async () => {
  if (!uid.value || requesting.value) return
  requesting.value = true
  try {
    await $api(`/api/user/account/${uid.value}/request-data-export`, {
      method: 'POST',
    })
    toast.add({
      title: t('export.requested_title'),
      description: t('export.requested_description'),
      color: 'info',
      icon: 'i-lucide-mail',
    })
    await loadExports()
    pollExports()
  }
  catch (error) {
    log.error({ action: 'privacy:requestExport', error })
    toast.add({
      title: t('export.error_title'),
      color: 'error',
      icon: 'i-lucide-triangle-alert',
    })
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

// Deletion modal state
const isDeleteModalOpen = ref(false)
const confirmText = ref('')
const deleting = ref(false)

const canConfirmDelete = computed(() =>
  confirmText.value === 'DELETE' && !deleting.value,
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
      body: { confirmation: 'DELETE' },
    })
    toast.add({
      title: t('delete.scheduled_title'),
      description: t('delete.scheduled_description'),
      color: 'success',
      icon: 'i-lucide-circle-check',
    })
    isDeleteModalOpen.value = false
    await clearSession()
    await router.push(localePath('index'))
  }
  catch (error) {
    log.error({ action: 'privacy:deleteAccount', error })
    toast.add({
      title: t('delete.error_title'),
      description: t('delete.error_description'),
      color: 'error',
      icon: 'i-lucide-triangle-alert',
    })
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
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader
      :title="t('title')"
      :lead="t('lead')"
    />

    <section
      aria-labelledby="privacy-export-title"
      class="flex flex-col gap-5 rounded-[1.25rem] bg-default p-5 ring ring-default sm:p-6"
    >
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div class="flex min-w-0 items-center gap-4">
          <span
            class="
              flex size-11 shrink-0 items-center justify-center rounded-xl
              bg-elevated text-highlighted
            "
          >
            <UIcon
              name="i-lucide-download"
              class="size-5"
              aria-hidden="true"
            />
          </span>
          <div class="flex min-w-0 flex-col gap-1">
            <h2
              id="privacy-export-title"
              class="font-semibold text-highlighted"
            >
              {{ t('export.title') }}
            </h2>
            <p class="text-sm text-toned">
              {{ t('export.description') }}
            </p>
          </div>
        </div>
        <UButton
          color="neutral"
          variant="solid"
          :loading="requesting"
          :disabled="isProcessing || requesting"
          class="max-sm:w-full max-sm:justify-center"
          @click="requestExport"
        >
          {{ isReady ? t('export.request_again') : t('export.request') }}
        </UButton>
      </div>

      <div
        v-if="latest"
        class="flex flex-col gap-3 rounded-xl bg-elevated p-4"
      >
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
          <UBadge
            :color="statusColor"
            variant="soft"
            size="sm"
          >
            {{ t(`export.status.${latest.status}`) }}
          </UBadge>
          <span
            v-if="latest.createdAt"
            class="text-xs text-toned"
          >
            {{ t('export.requested_at') }}
            <NuxtTime
              :datetime="latest.createdAt"
              :locale="locale"
              date-style="medium"
              time-style="short"
            />
          </span>
          <span
            v-if="isReady && latest.expiresAt"
            class="text-xs text-toned"
          >
            {{ t('export.expires_at') }}
            <NuxtTime
              :datetime="latest.expiresAt"
              :locale="locale"
              date-style="medium"
              time-style="short"
            />
          </span>
          <span
            v-if="isReady && fileSizeLabel"
            class="text-xs text-toned"
          >
            {{ fileSizeLabel }}
          </span>
        </div>

        <UProgress
          v-if="isProcessing"
          size="sm"
          color="neutral"
          animation="carousel"
        />

        <p
          v-if="latest.status === 'failed'"
          role="alert"
          class="text-sm text-toned"
        >
          {{ t('export.failed_description') }}
        </p>

        <div v-if="isReady">
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-download"
            @click="openDownload"
          >
            {{ t('export.download') }}
          </UButton>
        </div>
      </div>
    </section>

    <section
      aria-labelledby="privacy-delete-title"
      class="flex flex-col gap-4 rounded-[1.25rem] bg-default p-5 ring ring-default sm:p-6"
    >
      <div class="flex flex-col gap-1">
        <h2
          id="privacy-delete-title"
          class="font-semibold text-highlighted"
        >
          {{ t('delete.title') }}
        </h2>
        <p class="text-sm text-toned">
          {{ t('delete.description') }}
        </p>
      </div>

      <UAlert
        v-if="forfeitTitle"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="forfeitTitle"
      />

      <div>
        <UButton
          color="error"
          variant="outline"
          icon="i-lucide-trash-2"
          @click="onOpenModal"
        >
          {{ t('delete.open_modal') }}
        </UButton>
      </div>
    </section>

    <UModal
      v-model:open="isDeleteModalOpen"
      :title="t('delete.modal_title')"
      :description="t('delete.modal_description')"
      :dismissible="!deleting"
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-triangle-alert"
            :title="t('delete.modal_alert_title')"
            :description="t('delete.modal_alert_description')"
          />
          <UFormField
            :label="t('delete.confirm_label')"
            name="confirm"
            required
          >
            <UInput
              v-model="confirmText"
              placeholder="DELETE"
              autocomplete="off"
              :disabled="deleting"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="deleting"
            @click="() => { isDeleteModalOpen = false }"
          >
            {{ t('delete.cancel') }}
          </UButton>
          <UButton
            color="error"
            variant="solid"
            icon="i-lucide-trash-2"
            :loading="deleting"
            :disabled="!canConfirmDelete"
            @click="onConfirmDelete"
          >
            {{ t('delete.confirm_button') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Τα δεδομένα σου
  lead: Κατέβασε ό,τι κρατάμε για εσένα ή κλείσε τον λογαριασμό σου.
  export:
    title: Εξαγωγή των δεδομένων σου
    description: Ζήτα ένα αντίγραφο σε JSON με όλα όσα έχουμε συνδεδεμένα με τον λογαριασμό σου — προφίλ, παραγγελίες, αγαπημένα, κριτικές, σχόλια, αγορές πόντων, ειδοποιήσεις και εγγραφές. Ο σύνδεσμος λήψης ισχύει 7 ημέρες.
    request: Ζήτα εξαγωγή
    request_again: Ζήτα νέα εξαγωγή
    download: Λήψη αρχείου
    requested_title: Η εξαγωγή προστέθηκε στην ουρά
    requested_description: Θα σου στείλουμε email όταν είναι έτοιμη.
    requested_at: "Αίτημα:"
    expires_at: "Λήγει:"
    error_title: Δεν ήταν δυνατή η αίτηση εξαγωγής.
    failed_description: Κάτι πήγε στραβά κατά τη δημιουργία του αρχείου. Μπορείς να το ξαναδοκιμάσεις.
    status:
      pending: Σε αναμονή
      processing: Σε επεξεργασία
      ready: Έτοιμο
      failed: Απέτυχε
      expired: Έληξε
  delete:
    title: Διαγραφή λογαριασμού
    description: Διαγράφονται οριστικά το προφίλ, οι διευθύνσεις, οι κριτικές, τα αγαπημένα, τα σχόλια, οι πόντοι πιστότητας και οι εγγραφές σου. Οι παραγγελίες διατηρούνται ανώνυμες για λόγους φορολογικής τεκμηρίωσης. Η ενέργεια δεν αναιρείται και θα αποσυνδεθείς άμεσα από όλες τις συσκευές.
    lost_points: "Έχεις {points} πόντο, που χάνεται όταν διαγραφεί ο λογαριασμός | Έχεις {points} πόντους, που χάνονται όταν διαγραφεί ο λογαριασμός"
    lost_balance: Έχεις υπόλοιπο {balance} σε δωροκάρτες, το οποίο χάνεται όταν διαγραφεί ο λογαριασμός
    lost_both: "Έχεις {points} πόντο και υπόλοιπο {balance} σε δωροκάρτες, που χάνονται και τα δύο όταν διαγραφεί ο λογαριασμός | Έχεις {points} πόντους και υπόλοιπο {balance} σε δωροκάρτες, που χάνονται και τα δύο όταν διαγραφεί ο λογαριασμός"
    open_modal: Διαγραφή του λογαριασμού μου
    modal_title: Επιβεβαίωση οριστικής διαγραφής
    modal_description: Για την προστασία του λογαριασμού σου, πληκτρολόγησε DELETE παρακάτω για να επιβεβαιώσεις.
    modal_alert_title: Οριστική ενέργεια
    modal_alert_description: Μετά την επιβεβαίωση δεν μπορούμε να ανακτήσουμε τα δεδομένα σου.
    confirm_label: 'Πληκτρολόγησε "DELETE" για επιβεβαίωση'
    cancel: Άκυρο
    confirm_button: Διαγραφή οριστικά
    scheduled_title: Ο λογαριασμός σου διαγράφεται
    scheduled_description: Αποσυνδέθηκες — τα δεδομένα σου θα διαγραφούν σε λίγα δευτερόλεπτα.
    error_title: Δεν ήταν δυνατή η διαγραφή
    error_description: Δοκίμασε ξανά ή επικοινώνησε με την υποστήριξη.
en:
  title: Your data
  lead: Download everything we hold about you, or close your account.
  export:
    title: Export your data
    description: Ask for a JSON copy of everything we hold against your account — profile, orders, favourites, reviews, comments, points purchases, notifications and subscriptions. The download link is valid for 7 days.
    request: Request an export
    request_again: Request a new export
    download: Download file
    requested_title: Your export is queued
    requested_description: We will email you when it is ready.
    requested_at: "Requested:"
    expires_at: "Expires:"
    error_title: The export could not be requested.
    failed_description: Something went wrong while building the file. You can try again.
    status:
      pending: Pending
      processing: Processing
      ready: Ready
      failed: Failed
      expired: Expired
  delete:
    title: Delete account
    description: Your profile, addresses, reviews, favourites, comments, loyalty points and subscriptions are deleted for good. Orders are kept in anonymised form for tax records. This cannot be undone, and you are signed out of every device immediately.
    lost_points: "You have {points} point, which is lost when the account is deleted | You have {points} points, which are lost when the account is deleted"
    lost_balance: You have a {balance} gift card balance, which is lost when the account is deleted
    lost_both: "You have {points} point and a {balance} gift card balance, both lost when the account is deleted | You have {points} points and a {balance} gift card balance, both lost when the account is deleted"
    open_modal: Delete my account
    modal_title: Confirm permanent deletion
    modal_description: To protect your account, type DELETE below to confirm.
    modal_alert_title: This is permanent
    modal_alert_description: Once you confirm we cannot recover your data.
    confirm_label: 'Type "DELETE" to confirm'
    cancel: Cancel
    confirm_button: Delete permanently
    scheduled_title: Your account is being deleted
    scheduled_description: You have been signed out — your data will be gone in a few seconds.
    error_title: The account could not be deleted
    error_description: Try again, or get in touch with support.
</i18n>
