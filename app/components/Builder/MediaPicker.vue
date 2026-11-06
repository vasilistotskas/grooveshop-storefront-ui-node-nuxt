<script lang="ts" setup>
import { DEFAULT_LOCALE } from '~~/i18n/locales'
import { zBuilderMediaInUse } from '~~/shared/openapi/zod.gen'

defineProps<{
  /** The asset id the setting holds now, marked in the library. */
  selected: number | undefined
}>()

const emit = defineEmits<{
  /** The image to use: the library's own record of it, alt text included. */
  select: [asset: Asset]
  /** An image was deleted from the library: a setting that holds it holds nothing now. */
  remove: [id: number]
}>()

const open = defineModel<boolean>('open', { required: true })

const { t } = useStoreI18n('components/Builder/MediaPicker')
const toast = useToast()
const { notify } = useApiError()
const { documentLabel } = useBuilderLabels()

const searchTerm = ref('')
const search = refDebounced(computed(() => searchTerm.value.trim()), BUILDER_LINK_SEARCH_DELAY_MS)
const page = ref(1)
watch(search, () => {
  page.value = 1
})

// Its own key: pickers of one page share a call site and a query, and a shared key would keep the first one's `enabled`.
const { data: library, status, refresh } = useLazyApi('/api/builder/media', {
  key: `builder-media-library-${useId()}`,
  query: computed(() => ({
    page: page.value,
    pageSize: BUILDER_MEDIA_PAGE_SIZE,
    ...(search.value && { search: search.value }),
  })),
  enabled: open,
})

/** The image being looked at, and the alt text being written for it, by language. */
const current = ref<Asset>()
const alt = ref<Record<string, string>>({})
const busy = ref(false)
const confirmingDelete = ref(false)

watch(current, (asset) => {
  alt.value = { ...asset?.alt }
  confirmingDelete.value = false
})
// `enabled` only blocks a fetch; opening is what asks for the library, afresh each time from its first page (an upload elsewhere shows).
watch(open, (isOpen) => {
  if (!isOpen) {
    current.value = undefined
    return
  }
  // A new page is itself a new question; the same page is asked again.
  if (page.value === 1) void refresh()
  else page.value = 1
})

const languages = computed(() => current.value ? toUiLocales(Object.keys(current.value.alt)) : [])
const altChanged = computed(() => current.value !== undefined && Object.entries(alt.value).some(([code, text]) => text !== current.value!.alt[code]))

async function upload(file: unknown): Promise<void> {
  if (!(file instanceof File)) return
  const body = new FormData()
  body.append('file', file)
  busy.value = true
  try {
    const stored = await $api<AssetStored>('/api/builder/media', { method: 'POST', body })
    current.value = stored
    await refresh()
    if (stored.duplicate) toast.add({ title: t('duplicate'), icon: 'i-lucide-copy', color: 'neutral' })
  }
  catch (error) {
    notify('builder:media-upload', error, { title: t('uploadFailed'), fallback: t('tryAgain') })
  }
  finally {
    busy.value = false
  }
}

async function saveAlt(): Promise<void> {
  if (!current.value) return
  busy.value = true
  try {
    current.value = await $api<Asset>(`/api/builder/media/${current.value.id}`, { method: 'PATCH', body: { alt: alt.value } })
    await refresh()
    toast.add({ title: t('saved'), icon: 'i-lucide-check', color: 'success' })
  }
  catch (error) {
    notify('builder:media-alt', error, { title: t('saveFailed'), fallback: t('tryAgain') })
  }
  finally {
    busy.value = false
  }
}

async function remove(): Promise<void> {
  if (!current.value) return
  busy.value = true
  try {
    const { id } = current.value
    await $api(`/api/builder/media/${id}`, { method: 'DELETE' })
    current.value = undefined
    emit('remove', id)
    // The last image of the last page leaves that page empty: Django answers 404 past the end, so step back.
    if (page.value > 1 && library.value?.results.length === 1) page.value -= 1
    else await refresh()
  }
  catch (error) {
    // A published page still uses it: Django names the documents, and the editor says which.
    const inUse = zBuilderMediaInUse.safeParse((error as { data?: unknown }).data)
    if (inUse.success) {
      toast.add({ id: 'builder:media-delete', title: t('inUse'), description: inUse.data.usedBy.map(documentLabel).join(', '), color: 'warning', icon: 'i-lucide-triangle-alert' })
    }
    else {
      notify('builder:media-delete', error, { title: t('deleteFailed'), fallback: t('tryAgain') })
    }
    confirmingDelete.value = false
  }
  finally {
    busy.value = false
  }
}

function use(): void {
  if (!current.value) return
  emit('select', current.value)
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('title')"
    :description="t('description')"
    :ui="{ content: 'sm:max-w-3xl' }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UFileUpload
          accept="image/*"
          :label="t('upload')"
          :description="t('uploadHelp')"
          :model-value="null"
          :preview="false"
          :disabled="busy"
          reset
          @update:model-value="upload"
        />

        <UInput
          v-model="searchTerm"
          type="search"
          icon="i-lucide-search"
          :placeholder="t('search')"
          :aria-label="t('search')"
          class="w-full"
        />

        <UEmpty
          v-if="status === 'pending' && !library"
          loading
          variant="naked"
          :title="t('loading')"
        />
        <UEmpty
          v-else-if="status === 'error'"
          icon="i-lucide-cloud-off"
          variant="naked"
          :title="t('error')"
          :actions="[{ label: t('retry'), color: 'neutral', variant: 'outline', onClick: () => refresh() }]"
        />
        <p
          v-else-if="!library?.results.length"
          class="text-sm text-toned"
        >
          {{ search ? t('noResults') : t('empty') }}
        </p>
        <ul
          v-else
          class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6"
        >
          <li
            v-for="asset in library.results"
            :key="asset.id"
          >
            <button
              type="button"
              class="relative block aspect-square w-full overflow-hidden rounded-md bg-elevated ring focus-visible:outline-2 focus-visible:outline-primary"
              :class="current?.id === asset.id ? 'ring-2 ring-primary' : 'ring-default'"
              :aria-label="builderMediaName(asset.path)"
              :aria-pressed="current?.id === asset.id"
              @click="() => { current = asset }"
            >
              <ImgWithFallback
                :src="asset.path"
                alt=""
                :width="120"
                :height="120"
                fit="cover"
                class="size-full object-cover"
              />
              <UIcon
                v-if="asset.id === selected"
                name="i-lucide-circle-check"
                class="absolute end-1 top-1 size-5 rounded-full bg-default text-primary"
              />
            </button>
          </li>
        </ul>
        <UPagination
          v-if="library && library.count > BUILDER_MEDIA_PAGE_SIZE"
          v-model:page="page"
          :total="library.count"
          :items-per-page="BUILDER_MEDIA_PAGE_SIZE"
          class="self-center"
        />

        <form
          v-if="current"
          class="flex flex-col gap-3 rounded-md border border-default p-3"
          @submit.prevent="saveAlt"
        >
          <p class="text-sm font-medium break-words">
            {{ builderMediaName(current.path) }}
            <span class="font-normal text-muted">
              · {{ t('size', { width: current.width, height: current.height }) }}
            </span>
          </p>
          <p
            v-if="current.usedBy.length"
            class="text-xs text-muted"
          >
            {{ t('usedBy', { pages: current.usedBy.map(documentLabel).join(', ') }) }}
          </p>
          <UFormField
            v-for="language in languages"
            :key="language.code"
            :label="t('alt', { language: language.name })"
            :help="language.code === DEFAULT_LOCALE ? t('altHelp') : undefined"
          >
            <UInput
              v-model="alt[language.code]"
              class="w-full"
              :disabled="busy"
            />
          </UFormField>
          <div class="flex flex-wrap items-center gap-2">
            <UButton
              type="submit"
              color="neutral"
              variant="outline"
              icon="i-lucide-save"
              :label="t('saveAlt')"
              :disabled="!altChanged"
              :loading="busy"
            />
            <UButton
              v-if="!confirmingDelete"
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              :label="t('delete')"
              :disabled="busy"
              @click="() => { confirmingDelete = true }"
            />
            <UButton
              v-else
              color="error"
              icon="i-lucide-trash-2"
              :label="t('confirmDelete')"
              :loading="busy"
              @click="remove"
            />
            <UButton
              class="ms-auto"
              icon="i-lucide-check"
              :label="t('use')"
              :disabled="busy || altChanged"
              @click="use"
            />
          </div>
        </form>
      </div>
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  title: Βιβλιοθήκη εικόνων
  description: Επιλέξτε μια εικόνα ή ανεβάστε νέα. Το εναλλακτικό κείμενο ανήκει στην εικόνα και ισχύει παντού όπου χρησιμοποιείται.
  upload: Ανεβάστε μια εικόνα
  uploadHelp: Σύρετε ένα αρχείο εδώ ή πατήστε για να το επιλέξετε
  search: Αναζήτηση με όνομα ή εναλλακτικό κείμενο
  loading: Φόρτωση…
  error: Η βιβλιοθήκη δεν φορτώθηκε.
  retry: Δοκιμάστε ξανά
  empty: Δεν υπάρχουν εικόνες ακόμη.
  noResults: Δεν βρέθηκε τίποτα.
  size: "{width} × {height} px"
  usedBy: "Χρησιμοποιείται σε: {pages}"
  alt: "Εναλλακτικό κείμενο ({language})"
  altHelp: Περιγράψτε την εικόνα για όσους δεν τη βλέπουν.
  saveAlt: Αποθήκευση κειμένου
  saved: Το κείμενο αποθηκεύτηκε
  saveFailed: Το κείμενο δεν αποθηκεύτηκε
  delete: Διαγραφή
  confirmDelete: Επιβεβαίωση διαγραφής
  inUse: Η εικόνα χρησιμοποιείται σε δημοσιευμένες σελίδες
  deleteFailed: Η εικόνα δεν διαγράφηκε
  use: Χρήση αυτής της εικόνας
  duplicate: Η εικόνα υπήρχε ήδη στη βιβλιοθήκη
  uploadFailed: Η εικόνα δεν ανέβηκε
  tryAgain: Δοκιμάστε ξανά.
en:
  title: Image library
  description: Choose an image or upload a new one. The alt text belongs to the image and applies everywhere it is used.
  upload: Upload an image
  uploadHelp: Drop a file here or press to choose one
  search: Search by name or alt text
  loading: Loading…
  error: The library did not load.
  retry: Try again
  empty: There are no images yet.
  noResults: Nothing found.
  size: "{width} × {height} px"
  usedBy: "Used on: {pages}"
  alt: "Alt text ({language})"
  altHelp: Describe the image for people who cannot see it.
  saveAlt: Save alt text
  saved: Alt text saved
  saveFailed: The alt text was not saved
  delete: Delete
  confirmDelete: Confirm delete
  inUse: The image is used on published pages
  deleteFailed: The image was not deleted
  use: Use this image
  duplicate: That image was already in the library
  uploadFailed: The image was not uploaded
  tryAgain: Try again.
</i18n>
