<script lang="ts" setup>
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * The enquiry form: who is asking, what about, the message, optional
 * files, and the tick that lets us answer by email.
 *
 * The topic is one of a short, fixed list and goes to Django as the
 * enquiry's `subject` (the label, in the visitor's language, so the
 * inbox reads it as written). The consent tick is a courtesy of the
 * page: Django does not take it, so it is checked here and not sent.
 * Files go up one by one as they are picked (`useContactAttachments`)
 * and the enquiry only carries their ids.
 */
const { t, locale } = useI18n()
const toast = useToast()
const localePath = useLocalePath()
const attachments = useContactAttachments()

const isSubmitting = ref(false)

const TOPICS = ['order', 'product', 'delivery', 'account', 'other'] as const
const topicItems = computed(() => TOPICS.map(value => ({ value, label: t(`topics.${value}`) })))

const schema = z.object({
  name: z.string({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.string.invalid'),
  }).min(2, { error: t('validation.string.invalid') })
    .max(100, { error: t('validation.max', { max: 100 }) }),

  email: z.email({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.email.valid'),
  }).max(254, { error: t('validation.max', { max: 254 }) }),

  topic: z.enum(TOPICS).optional(),

  message: z.string({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.string.invalid'),
  }).min(10, { error: t('validation.min', { min: 10 }) })
    .max(5000, { error: t('validation.max', { max: 5000 }) })
    // Django's contact spam filter rejects anything under 5 words
    // (contact/utils.py detect_spam_patterns) — mirror it here so a
    // short-but-legitimate inquiry gets an inline hint instead of an
    // opaque 400 at submit.
    .refine(
      value => value.trim().split(/\s+/).filter(Boolean).length >= 5,
      { error: t('validation.message.min_words', { min: 5 }) },
    ),

  consent: z.boolean({ error: () => t('consent_required') })
    .refine(value => value, { error: t('consent_required') }),
})

type Schema = z.output<typeof schema>

const state = reactive<{
  name?: string
  email?: string
  topic?: (typeof TOPICS)[number]
  message?: string
  consent?: boolean
}>({
  name: undefined,
  email: undefined,
  topic: undefined,
  message: undefined,
  consent: undefined,
})

// ── Attachments ─────────────────────────────────────────────────────
const filePicker = useTemplateRef<HTMLInputElement>('filePicker')
const isDropTarget = ref(false)

/**
 * The composable reports a CODE; what it means is said here, in the
 * visitor's language. A rejection carries Django's own wording.
 */
function attachmentMessage(error: AttachmentError): string {
  if (error.code === 'too-large') return t('files.too_large', { mb: attachments.maxMegabytes.value })
  if (error.code === 'too-many') return t('files.too_many', { count: attachments.maxCount.value })
  if (error.code === 'throttled') return t('files.throttled')
  if (error.code === 'busy') return t('files.busy')
  if (error.code === 'network') return t('files.network')
  return isDrfFieldErrorMap(error.data)
    ? formatDrfFieldErrors(error.data, t)
    : t('files.rejected')
}

function onFilesPicked(files: FileList | null) {
  if (!files?.length) return
  for (const refusal of attachments.add(Array.from(files))) {
    toast.add({
      title: t('files.not_added'),
      description: attachmentMessage(refusal),
      color: 'error',
    })
  }
  // So picking the same file again after removing it still fires `change`.
  if (filePicker.value) filePicker.value.value = ''
}

function onDrop(event: DragEvent) {
  isDropTarget.value = false
  onFilesPicked(event.dataTransfer?.files ?? null)
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (isSubmitting.value) return
  // An upload still in flight has no id yet, and submitting would
  // silently drop it.
  if (attachments.isUploading.value) {
    toast.add({ title: t('files.uploading'), color: 'warning' })
    return
  }
  isSubmitting.value = true
  try {
    await $api('/api/contact', {
      method: 'POST',
      body: {
        name: event.data.name,
        email: event.data.email,
        message: event.data.message,
        subject: event.data.topic ? t(`topics.${event.data.topic}`) : undefined,
        // Ids of files already uploaded and not yet claimed; omitted
        // when there are none, so a store with attachments off never
        // sends the field.
        attachmentIds: attachments.attachmentIds.value.length
          ? attachments.attachmentIds.value
          : undefined,
      },
    })

    toast.add({
      title: t('success.title'),
      color: 'success',
    })

    state.name = undefined
    state.email = undefined
    state.topic = undefined
    state.message = undefined
    state.consent = undefined
    // The ids have been spent: each one is good for one enquiry.
    attachments.reset()
  }
  catch (error) {
    // The proxy forwards Django's 4xx validation body — surface the
    // field detail (spam filter, disposable email, …) instead of a
    // blanket failure.
    const data = error && typeof error === 'object' && 'data' in error
      ? (error as { data: unknown }).data
      : null
    toast.add({
      title: t('error.default'),
      description: isDrfFieldErrorMap(data)
        ? formatDrfFieldErrors(data, t)
        : undefined,
      color: 'error',
    })
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="
      flex flex-col gap-5 rounded-[1.25rem] bg-default p-5 ring ring-default
      sm:p-6
    "
    @error="scrollToFirstFormError"
    @submit="onSubmit"
  >
    <div class="grid gap-5 sm:grid-cols-2">
      <UFormField
        :label="t('name')"
        name="name"
        required
      >
        <UInput
          v-model="state.name"
          autocomplete="name"
          class="w-full"
        />
      </UFormField>

      <UFormField
        :label="t('email.title')"
        name="email"
        required
      >
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="email"
          class="w-full"
        />
      </UFormField>
    </div>

    <UFormField
      :label="t('topic')"
      name="topic"
    >
      <USelect
        v-model="state.topic"
        :items="topicItems"
        :placeholder="t('topic_placeholder')"
        class="w-full"
      />
    </UFormField>

    <UFormField
      :label="t('message')"
      name="message"
      required
    >
      <UTextarea
        v-model="state.message"
        :rows="6"
        class="w-full"
      />
    </UFormField>

    <!-- Rendered only while the store accepts uploads; the endpoint 404s
         when it does not. The input is hidden and out of the tab order:
         the button is the labelled control. -->
    <div
      v-if="attachments.enabled.value"
      class="flex flex-col gap-3"
    >
      <input
        ref="filePicker"
        type="file"
        class="sr-only"
        :accept="attachments.accept.value || undefined"
        multiple
        tabindex="-1"
        aria-hidden="true"
        @change="onFilesPicked(($event.target as HTMLInputElement).files)"
      >

      <div
        class="
          flex items-center gap-3 rounded-xl border border-dashed p-4
          transition-colors
        "
        :class="isDropTarget ? 'border-inverted bg-elevated' : 'border-accented'"
        @dragover.prevent="isDropTarget = true"
        @dragenter.prevent="isDropTarget = true"
        @dragleave="isDropTarget = false"
        @drop.prevent="onDrop"
      >
        <UIcon
          name="i-lucide-paperclip"
          class="size-5 shrink-0 text-highlighted"
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-highlighted">
            {{ t('files.prompt') }}
          </p>
          <p class="text-xs text-toned">
            {{ t('files.limit', { count: attachments.maxCount.value, mb: attachments.maxMegabytes.value }) }}
          </p>
        </div>
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          size="sm"
          :label="t('files.browse')"
          :disabled="!attachments.canAddMore.value"
          @click="() => { filePicker?.click() }"
        />
      </div>

      <ul
        v-if="attachments.uploads.value.length"
        class="flex flex-col gap-2"
      >
        <li
          v-for="upload in attachments.uploads.value"
          :key="upload.key"
          class="rounded-xl p-3 ring ring-default"
        >
          <p class="flex items-center gap-3 text-sm">
            <UIcon
              :name="upload.status === 'done'
                ? 'i-lucide-check'
                : upload.status === 'error'
                  ? 'i-lucide-triangle-alert'
                  : 'i-lucide-loader-circle'"
              class="size-4 shrink-0 text-highlighted"
              :class="upload.status === 'uploading' ? 'animate-spin' : ''"
              aria-hidden="true"
            />
            <span class="min-w-0 flex-1 truncate text-highlighted">{{ upload.name }}</span>
            <span class="shrink-0 font-mono text-xs text-toned">
              {{ formatAttachmentSize(upload.size, locale) }}
            </span>
            <UButton
              v-if="upload.status === 'error'"
              type="button"
              color="neutral"
              variant="link"
              size="xs"
              :label="t('files.retry')"
              @click="() => { attachments.retry(upload.key) }"
            />
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-x"
              square
              :aria-label="t('files.remove', { name: upload.name })"
              @click="() => { attachments.remove(upload.key) }"
            />
          </p>

          <UProgress
            v-if="upload.status === 'uploading'"
            :model-value="upload.progress"
            size="sm"
            class="mt-2"
            :aria-label="t('files.uploading_name', { name: upload.name })"
          />
          <p
            v-else-if="upload.status === 'error' && upload.error"
            class="mt-2 text-xs text-toned"
          >
            {{ attachmentMessage(upload.error) }}
          </p>
        </li>
      </ul>
    </div>

    <UFormField name="consent">
      <UCheckbox
        v-model="state.consent"
        color="neutral"
      >
        <template #label>
          {{ t('consent') }}
          <NuxtLink
            :to="localePath('privacy-policy')"
            class="
              text-highlighted underline underline-offset-4
              hover:no-underline
            "
          >
            {{ t('privacy') }}
          </NuxtLink>.
        </template>
      </UCheckbox>
    </UFormField>

    <UButton
      type="submit"
      color="neutral"
      size="lg"
      icon="i-lucide-send"
      class="w-fit"
      :loading="isSubmitting"
      :disabled="isSubmitting || attachments.isUploading.value"
      :label="t('submit')"
    />
  </UForm>
</template>

<i18n lang="yaml">
el:
  name: Όνομα
  email:
    title: Email
  topic: Θέμα
  topic_placeholder: Διάλεξε θέμα
  topics:
    order: Μια παραγγελία μου
    product: Ερώτηση για προϊόν
    delivery: Παράδοση ή επιστροφή
    account: Ο λογαριασμός μου
    other: Κάτι άλλο
  message: Μήνυμα
  consent: Συμφωνώ να χρησιμοποιηθούν τα στοιχεία μου για να απαντήσετε σε αυτό το μήνυμα, σύμφωνα με την
  privacy: πολιτική απορρήτου
  consent_required: Χρειαζόμαστε τη συγκατάθεσή σου για να απαντήσουμε
  submit: Αποστολή μηνύματος
  success:
    title: Το μήνυμά σου στάλθηκε
  error:
    default: Το μήνυμα δεν στάλθηκε. Δοκίμασε ξανά.
  files:
    prompt: Πρόσθεσε φωτογραφίες ή αρχεία
    limit: 'Έως {count} αρχεία, {mb} MB το καθένα'
    browse: Επιλογή
    retry: Δοκίμασε ξανά
    remove: Αφαίρεση του {name}
    uploading: Περίμενε να ανέβουν τα αρχεία
    uploading_name: Ανεβαίνει το {name}
    not_added: Το αρχείο δεν προστέθηκε
    too_large: 'Το αρχείο ξεπερνά τα {mb} MB.'
    too_many: 'Μπορείς να προσθέσεις έως {count} αρχεία.'
    throttled: Πολλές προσπάθειες. Δοκίμασε σε λίγο.
    busy: Η υπηρεσία είναι απασχολημένη. Δοκίμασε σε λίγο.
    network: Το αρχείο δεν ανέβηκε. Έλεγξε τη σύνδεσή σου.
    rejected: Το αρχείο δεν γίνεται δεκτό.
en:
  name: Name
  email:
    title: Email
  topic: Topic
  topic_placeholder: Choose a topic
  topics:
    order: An order I placed
    product: A product question
    delivery: Delivery or returns
    account: My account
    other: Something else
  message: Message
  consent: I agree to my data being used to answer this message, as set out in the
  privacy: privacy policy
  consent_required: We need your consent to answer
  submit: Send message
  success:
    title: Your message was sent
  error:
    default: The message was not sent. Please try again.
  files:
    prompt: Attach photos or files
    limit: 'Up to {count} files, {mb} MB each'
    browse: Browse
    retry: Try again
    remove: Remove {name}
    uploading: Wait for the files to finish uploading
    uploading_name: Uploading {name}
    not_added: The file was not added
    too_large: 'The file is over {mb} MB.'
    too_many: 'You can add up to {count} files.'
    throttled: Too many tries. Please wait a moment.
    busy: The service is busy. Please wait a moment.
    network: The file did not upload. Check your connection.
    rejected: The file is not accepted.
</i18n>
