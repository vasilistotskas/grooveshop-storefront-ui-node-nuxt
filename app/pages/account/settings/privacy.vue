<script lang="ts" setup>
const { t, d, n } = useI18n()
const toast = useToast()
const router = useRouter()
const localePath = useLocalePath()
const { user, loggedIn, clear: clearSession } = useUserSession()

defineRouteRules({
  robots: false,
})

definePageMeta({
  layout: 'user',
})

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
    case 'processing':
    case 'pending': return 'info'
    case 'expired': return 'warning'
    case 'failed': return 'error'
    default: return 'neutral'
  }
})

const statusIcon = computed(() => {
  switch (latest.value?.status) {
    case 'ready': return 'i-heroicons-check-circle'
    case 'processing':
    case 'pending': return 'i-heroicons-arrow-path'
    case 'expired': return 'i-heroicons-clock'
    case 'failed': return 'i-heroicons-exclamation-triangle'
    default: return 'i-heroicons-information-circle'
  }
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
    const res = await $fetch(`/api/user/account/${uid.value}/data-exports`)
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
    await $fetch(`/api/user/account/${uid.value}/request-data-export`, {
      method: 'POST',
    })
    toast.add({
      title: t('export.requested_title'),
      description: t('export.requested_description'),
      color: 'info',
      icon: 'i-heroicons-envelope',
    })
    await loadExports()
    pollExports()
  }
  catch (error) {
    log.error({ action: 'privacy:requestExport', error })
    toast.add({
      title: t('export.error_title'),
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle',
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
    await $fetch(`/api/user/account/${uid.value}/delete-account`, {
      method: 'POST',
      body: { confirmation: 'DELETE' },
    })
    toast.add({
      title: t('delete.scheduled_title'),
      description: t('delete.scheduled_description'),
      color: 'success',
      icon: 'i-heroicons-check-circle',
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
      icon: 'i-heroicons-exclamation-triangle',
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
  <PageWrapper
    class="
      flex flex-col gap-4
      md:gap-8 md:!p-0
    "
  >
    <PageTitle
      :text="t('title')"
      class="hidden"
    />

    <div
      class="
        flex flex-col gap-6
        lg:flex-row lg:gap-8
      "
    >
      <aside class="lg:sticky lg:top-16 lg:w-72">
        <AccountAuthSettingsNavigation />
      </aside>

      <section class="flex min-w-0 flex-1 flex-col gap-6">
        <UPageCard
          :title="t('export.title')"
          :description="t('export.description')"
          icon="i-heroicons-document-arrow-down"
          variant="outline"
        >
          <div class="flex flex-col gap-4">
            <div
              v-if="latest"
              class="flex flex-wrap items-center gap-3"
            >
              <UBadge
                :color="statusColor"
                :icon="statusIcon"
                variant="subtle"
                size="sm"
              >
                {{ t(`export.status.${latest.status}`) }}
              </UBadge>
              <span
                v-if="latest.createdAt"
                class="
                  text-xs text-neutral-500
                  dark:text-neutral-400
                "
              >
                {{ t('export.requested_at', { at: d(new Date(latest.createdAt), 'short') }) }}
              </span>
              <span
                v-if="isReady && latest.expiresAt"
                class="
                  text-xs text-warning
                  dark:text-warning
                "
              >
                {{ t('export.expires_at', { at: d(new Date(latest.expiresAt), 'short') }) }}
              </span>
              <span
                v-if="isReady && fileSizeLabel"
                class="
                  text-xs text-neutral-500
                  dark:text-neutral-400
                "
              >
                · {{ fileSizeLabel }}
              </span>
            </div>

            <UProgress
              v-if="isProcessing"
              size="sm"
              color="info"
              animation="carousel"
            />

            <UAlert
              v-if="latest?.status === 'failed'"
              :title="t('export.failed_title')"
              :description="t('export.failed_description')"
              color="error"
              variant="subtle"
              icon="i-heroicons-exclamation-triangle"
            />
          </div>

          <template #footer>
            <div class="flex flex-wrap gap-3">
              <UButton
                v-if="isReady"
                color="success"
                variant="solid"
                icon="i-heroicons-arrow-down-tray"
                @click="openDownload"
              >
                {{ t('export.download') }}
              </UButton>
              <UButton
                color="primary"
                :variant="isReady ? 'outline' : 'solid'"
                icon="i-heroicons-document-plus"
                :loading="requesting"
                :disabled="isProcessing || requesting"
                @click="requestExport"
              >
                {{ isReady ? t('export.request_again') : t('export.request') }}
              </UButton>
            </div>
          </template>
        </UPageCard>

        <UPageCard
          :title="t('delete.title')"
          :description="t('delete.description')"
          icon="i-heroicons-trash"
          variant="soft"
          highlight
          highlight-color="error"
        >
          <div class="flex flex-col gap-3">
            <UAlert
              color="error"
              variant="subtle"
              icon="i-heroicons-shield-exclamation"
              :title="t('delete.warning_title')"
            >
              <template #description>
                <ul
                  class="
                    mt-2 list-inside list-disc space-y-1 text-sm
                    [&>li]:leading-relaxed
                  "
                >
                  <li>{{ t('delete.bullet_profile') }}</li>
                  <li>{{ t('delete.bullet_orders') }}</li>
                  <li>{{ t('delete.bullet_irreversible') }}</li>
                  <li>{{ t('delete.bullet_logout') }}</li>
                </ul>
              </template>
            </UAlert>
          </div>

          <template #footer>
            <UButton
              color="error"
              variant="solid"
              icon="i-heroicons-trash"
              @click="onOpenModal"
            >
              {{ t('delete.open_modal') }}
            </UButton>
          </template>
        </UPageCard>
      </section>
    </div>

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
            icon="i-heroicons-exclamation-triangle"
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
            @click="isDeleteModalOpen = false"
          >
            {{ t('delete.cancel') }}
          </UButton>
          <UButton
            color="error"
            variant="solid"
            icon="i-heroicons-trash"
            :loading="deleting"
            :disabled="!canConfirmDelete"
            @click="onConfirmDelete"
          >
            {{ t('delete.confirm_button') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Απόρρητο & Δεδομένα
  export:
    title: Λήψη των δεδομένων μου
    description: Ζήτα ένα αντίγραφο σε JSON με όλα όσα έχουμε συνδεδεμένα με τον λογαριασμό σου — προφίλ, παραγγελίες, αγαπημένα, κριτικές, σχόλια, αγορές πόντων, ειδοποιήσεις και εγγραφές. Ο σύνδεσμος λήξης ισχύει για 7 ημέρες.
    request: Ζήτα εξαγωγή
    request_again: Ζήτα νέα εξαγωγή
    download: Λήψη αρχείου
    requested_title: Η εξαγωγή προστέθηκε στην ουρά
    requested_description: Θα σου στείλουμε email όταν είναι έτοιμη.
    requested_at: "Αίτημα: {at}"
    expires_at: "Λήγει: {at}"
    error_title: Δεν ήταν δυνατή η αίτηση εξαγωγής.
    failed_title: Η εξαγωγή απέτυχε
    failed_description: Κάτι πήγε στραβά κατά τη δημιουργία του αρχείου. Μπορείς να το ξαναδοκιμάσεις.
    status:
      pending: Σε αναμονή
      processing: Σε επεξεργασία
      ready: Έτοιμο
      failed: Απέτυχε
      expired: Έληξε
  delete:
    title: Διαγραφή λογαριασμού
    description: Οριστική διαγραφή του λογαριασμού σου και όλων των σχετικών δεδομένων. Οι παραγγελίες διατηρούνται ανώνυμες για λόγους φορολογικής τεκμηρίωσης.
    warning_title: Αυτή η ενέργεια δεν αναιρείται
    bullet_profile: Τα δεδομένα προφίλ, διευθύνσεις, κριτικές, αγαπημένα, σχόλια, πόντοι πιστότητας και εγγραφές διαγράφονται οριστικά.
    bullet_orders: Οι παραγγελίες σου διατηρούνται σε ανώνυμη μορφή (απαιτείται από τη φορολογική νομοθεσία).
    bullet_irreversible: Η ενέργεια δεν αναιρείται μετά την επιβεβαίωση.
    bullet_logout: Θα αποσυνδεθείς άμεσα από όλες τις συσκευές.
    open_modal: Διαγραφή λογαριασμού
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
</i18n>
