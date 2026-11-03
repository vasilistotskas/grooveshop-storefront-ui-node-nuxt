<script lang="ts" setup>
const { t, locale } = useStoreI18n('components/Builder/ShareDialog')
const toast = useToast()
const { notify } = useApiError()
const localePath = useLocalePath()
const store = useBuilderEditorStore()
const share = useBuilderShareStore()
const { documentKey } = useBuilderEditorView()
const { documentLabel } = useBuilderLabels()
const { copy, copied } = useClipboard({ copiedDuring: 2000 })

const open = ref(false)
const note = ref('')
const busy = ref(false)
/** The link just made: its address is shown once, because Django keeps only the token's hash. */
const created = ref<string>()

watch(open, (isOpen) => {
  if (isOpen) void share.load()
  else created.value = undefined
})

/** What a link freezes: the page and the section groups around it, as the preview draws them. */
const documents = computed(() => [documentKey.value, ...store.groups.map(({ key }) => key)])

async function create(): Promise<void> {
  busy.value = true
  try {
    const result = await share.create(documents.value, note.value.trim())
    if (result === 'unsaved') {
      toast.add({ title: t('unsaved.title'), description: t('unsaved.description'), color: 'warning', icon: 'i-lucide-cloud-off' })
      return
    }
    const path = localePath(pathLocation(builderSharePath(result.token, parseBuilderDocumentKey(documentKey.value).name!)))
    created.value = new URL(path, window.location.origin).href
    note.value = ''
  }
  catch (error) {
    notify('builder:share-create', error, { title: t('createFailed'), fallback: t('tryAgain') })
  }
  finally {
    busy.value = false
  }
}

async function revoke(link: PreviewLink): Promise<void> {
  try {
    await share.revoke(link.id)
    toast.add({ title: t('revoked'), icon: 'i-lucide-link-2-off', color: 'success' })
  }
  catch (error) {
    notify('builder:share-revoke', error, { title: t('revokeFailed'), fallback: t('tryAgain') })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('title')"
    :description="t('description')"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <UTooltip :text="t('title')">
      <UButton
        icon="i-lucide-share-2"
        color="neutral"
        variant="ghost"
        :aria-label="t('title')"
      />
    </UTooltip>

    <template #body>
      <form
        class="flex flex-col gap-3"
        @submit.prevent="create"
      >
        <UFormField
          :label="t('note.label')"
          :hint="t('note.hint')"
        >
          <UInput
            v-model="note"
            :maxlength="255"
            class="w-full"
          />
        </UFormField>
        <p class="text-sm text-toned">
          {{ t('covers', { page: documentLabel(documentKey) }) }}
        </p>
        <UButton
          type="submit"
          icon="i-lucide-link"
          :loading="busy"
          :label="t('create')"
        />
      </form>

      <div
        v-if="created"
        class="mt-4 flex flex-col gap-2 rounded-md bg-elevated p-3"
        role="status"
      >
        <p class="text-sm font-medium">
          {{ t('created.title') }}
        </p>
        <div class="flex items-center gap-2">
          <UInput
            :model-value="created"
            readonly
            class="min-w-0 flex-1"
            :aria-label="t('created.label')"
          />
          <UButton
            :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
            color="neutral"
            variant="outline"
            :label="copied ? t('created.copied') : t('created.copy')"
            @click="() => copy(created!)"
          />
        </div>
        <p class="text-xs text-toned">
          {{ t('created.once') }}
        </p>
      </div>

      <USeparator class="my-4" />

      <h3 class="mb-2 text-sm font-semibold">
        {{ t('open.title') }}
      </h3>
      <UEmpty
        v-if="share.status === 'loading'"
        loading
        variant="naked"
        :title="t('loading')"
      />
      <UEmpty
        v-else-if="share.status === 'error'"
        icon="i-lucide-cloud-off"
        variant="naked"
        :title="t('error')"
        :actions="[{ label: t('retry'), color: 'neutral', variant: 'outline', onClick: share.load }]"
      />
      <p
        v-else-if="!share.links.length"
        class="text-sm text-toned"
      >
        {{ t('open.none') }}
      </p>
      <ul
        v-else
        class="divide-y divide-default"
      >
        <li
          v-for="link in share.links"
          :key="link.id"
          class="flex items-start gap-3 py-3"
        >
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium break-words">
              {{ link.note || link.documents.map(documentLabel).join(', ') }}
            </p>
            <p class="text-xs text-muted">
              <template v-if="link.createdBy">
                {{ t('open.by', { name: link.createdBy.name }) }} ·
              </template>
              {{ t('open.expires') }}
              <NuxtTime
                :datetime="link.expiresAt"
                :locale="locale"
                date-style="medium"
                time-style="short"
              />
            </p>
          </div>
          <UButton
            icon="i-lucide-link-2-off"
            color="neutral"
            variant="outline"
            size="sm"
            :label="t('open.revoke')"
            @click="() => revoke(link)"
          />
        </li>
      </ul>
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  title: Κοινή προεπισκόπηση
  description: Δημιουργήστε σύνδεσμο που δείχνει τις αποθηκευμένες αλλαγές σας σε κάποιον χωρίς λογαριασμό, πριν τη δημοσίευση.
  note:
    label: Σημείωση
    hint: Προαιρετική, φαίνεται μόνο σε εσάς
  covers: "Ο σύνδεσμος δείχνει το πρόχειρο της σελίδας: {page}, μαζί με την κεφαλίδα και το υποσέλιδο."
  create: Δημιουργία συνδέσμου
  createFailed: Ο σύνδεσμος δεν δημιουργήθηκε
  tryAgain: Δοκιμάστε ξανά σε λίγο.
  unsaved:
    title: Οι αλλαγές σας δεν έχουν αποθηκευτεί ακόμη
    description: Ο σύνδεσμος θα έδειχνε παλιά εκδοχή. Περιμένετε να ολοκληρωθεί η αποθήκευση και δοκιμάστε ξανά.
  created:
    title: Ο σύνδεσμος είναι έτοιμος
    label: Διεύθυνση του συνδέσμου
    copy: Αντιγραφή
    copied: Αντιγράφηκε
    once: Αυτή η διεύθυνση εμφανίζεται μόνο τώρα. Αν τη χάσετε, ανακαλέστε τον σύνδεσμο και φτιάξτε νέο.
  open:
    title: Ενεργοί σύνδεσμοι
    none: Δεν υπάρχει ενεργός σύνδεσμος.
    by: "από {name}"
    expires: Λήγει
    revoke: Ανάκληση
  revoked: Ο σύνδεσμος ανακλήθηκε
  revokeFailed: Ο σύνδεσμος δεν ανακλήθηκε
  loading: Φόρτωση των συνδέσμων…
  error: Οι σύνδεσμοι δεν φορτώθηκαν
  retry: Δοκιμάστε ξανά
en:
  title: Share a preview
  description: Make a link that shows your saved changes to someone without an account, before you publish.
  note:
    label: Note
    hint: Optional, only you see it
  covers: "The link shows the draft of the page: {page}, with the header and footer."
  create: Create link
  createFailed: The link wasn't created
  tryAgain: Try again in a moment.
  unsaved:
    title: Your changes aren't saved yet
    description: The link would show an older version. Wait for saving to finish and try again.
  created:
    title: The link is ready
    label: Address of the link
    copy: Copy
    copied: Copied
    once: This address is shown only now. If you lose it, revoke the link and make a new one.
  open:
    title: Active links
    none: There are no active links.
    by: "by {name}"
    expires: Expires
    revoke: Revoke
  revoked: The link was revoked
  revokeFailed: The link wasn't revoked
  loading: Loading the links…
  error: The links didn't load
  retry: Try again
</i18n>
