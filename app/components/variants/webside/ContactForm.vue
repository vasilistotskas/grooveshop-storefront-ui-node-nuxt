<script lang="ts" setup>
import type * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

// The form's own copy (the attachment control's words) over the global
// messages the rest of the form speaks.
const { t, locale } = useStoreI18n('components/variants/webside/ContactForm')
const {
  attachments,
  filePicker,
  isDropTarget,
  attachmentMessage,
  onFilesPicked,
  onDrop,
  readyToSend,
  attachmentIds,
} = useContactAttachmentsControl({ t })
const { fields: schema, isSubmitting, send } = useContactEnquiry({ t })

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  email: undefined,
  message: undefined,
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!readyToSend()) return
  if (!await send({ ...event.data, attachmentIds: attachmentIds.value })) return

  state.name = undefined
  state.email = undefined
  state.message = undefined
  // The ids have been spent: each one is good for one enquiry.
  attachments.reset()
}
</script>

<template>
  <section
    class="
      container mx-auto
      sm:px-6 sm:py-6
      lg:px-8
    "
  >
    <div class="mx-auto max-w-xl">
      <!-- Form Card -->
      <UCard class="shadow-lg">
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-5"
          @error="scrollToFirstFormError"
          @submit="onSubmit"
        >
          <!-- Name Field -->
          <UFormField
            :label="t('name')"
            name="name"
            required
          >
            <UInput
              v-model="state.name"
              :placeholder="t('name')"
              icon="i-heroicons-user"
              size="xl"
              autocomplete="name"
              :ui="{
                root: 'w-full',
              }"
            />
          </UFormField>

          <!-- Email Field -->
          <UFormField
            :label="t('email.title')"
            name="email"
            required
          >
            <UInput
              v-model="state.email"
              icon="i-heroicons-envelope"
              :placeholder="t('email.title')"
              type="email"
              size="xl"
              autocomplete="email"
              :ui="{
                root: 'w-full',
              }"
            />
          </UFormField>

          <!-- Message Field -->
          <UFormField
            :label="t('message')"
            name="message"
            required
          >
            <UTextarea
              v-model="state.message"
              :placeholder="t('message')"
              :rows="6"
              size="xl"
              :ui="{
                root: 'w-full',
              }"
            />
          </UFormField>

          <!-- Rendered only while the store accepts uploads; the endpoint
               404s when it does not. The input is hidden and out of the tab
               order: the button is the labelled control. -->
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
                flex items-center gap-3 rounded-lg border border-dashed p-4
                transition-colors
              "
              :class="isDropTarget
                ? 'border-primary-500 bg-primary-100 dark:bg-primary-900'
                : 'border-primary-300 dark:border-primary-700'"
              @dragover.prevent="isDropTarget = true"
              @dragenter.prevent="isDropTarget = true"
              @dragleave="isDropTarget = false"
              @drop.prevent="onDrop"
            >
              <UIcon
                name="i-heroicons-paper-clip"
                class="size-6 shrink-0 text-primary-600 dark:text-primary-300"
                aria-hidden="true"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-primary-950 dark:text-primary-50">
                  {{ t('files.prompt') }}
                </p>
                <p
                  v-if="attachments.maxMegabytes.value !== null"
                  class="text-xs text-primary-600 dark:text-primary-300"
                >
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
                class="
                  rounded-lg p-3 ring ring-primary-200
                  dark:ring-primary-800
                "
              >
                <p class="flex items-center gap-3 text-sm">
                  <UIcon
                    :name="upload.status === 'done'
                      ? 'i-heroicons-check'
                      : upload.status === 'error'
                        ? 'i-heroicons-exclamation-triangle'
                        : 'i-heroicons-arrow-path'"
                    class="
                      size-4 shrink-0 text-primary-600
                      dark:text-primary-300
                    "
                    :class="upload.status === 'uploading' ? 'animate-spin' : ''"
                    aria-hidden="true"
                  />
                  <span class="min-w-0 flex-1 truncate text-primary-950 dark:text-primary-50">{{ upload.name }}</span>
                  <span class="shrink-0 font-mono text-xs text-primary-600 dark:text-primary-300">
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
                    icon="i-heroicons-x-mark"
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
                  class="mt-2 text-xs text-primary-600 dark:text-primary-300"
                >
                  {{ attachmentMessage(upload.error) }}
                </p>
              </li>
            </ul>
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <UButton
              type="submit"
              color="success"
              variant="soft"
              size="lg"
              block
              :loading="isSubmitting"
              :disabled="isSubmitting || attachments.isUploading.value"
            >
              {{ t('submit') }}
            </UButton>
          </div>
        </UForm>
      </UCard>
    </div>
  </section>
</template>

<i18n lang="yaml">
el:
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
    too_large_unknown: 'Το αρχείο είναι πολύ μεγάλο.'
    too_many: 'Μπορείς να προσθέσεις έως {count} αρχεία.'
    throttled: Πολλές προσπάθειες. Δοκίμασε σε λίγο.
    busy: Η υπηρεσία είναι απασχολημένη. Δοκίμασε σε λίγο.
    network: Το αρχείο δεν ανέβηκε. Έλεγξε τη σύνδεσή σου.
    rejected: Το αρχείο δεν γίνεται δεκτό.
en:
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
    too_large_unknown: 'The file is too large.'
    too_many: 'You can add up to {count} files.'
    throttled: Too many tries. Please wait a moment.
    busy: The service is busy. Please wait a moment.
    network: The file did not upload. Check your connection.
    rejected: The file is not accepted.
</i18n>
