<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import type { AttachmentError } from '~/composables/useContactAttachments'

/**
 * "Πείτε μας τι πρέπει να λειτουργήσει." — the contact page, as ONE
 * band, because that is how the artboard draws it: the copy and the
 * published offices left, the enquiry form right.
 *
 * Measured off the contact artboard at 1440px: a 520px left column and
 * a 688px panel on a 72px gap, 80px of band padding, a 40px display
 * heading, then bordered office cards (a 15px name with the office's
 * ROLE in teal monospace opposite it, the address and the phones on
 * icon rows) and the email on a card of its own. The panel repeats the
 * vendor cards' split: the subject chips on the page's own ground, the
 * form below a hairline on the raised one.
 *
 * The offices are NOT props — they come from `STORE_OFFICES`, the
 * setting the footer already reads, so the two cannot disagree about
 * an address. Same for the Γ.Ε.ΜΗ. number (the merchant identity) and
 * the LinkedIn link (the tenant's socials).
 *
 * The FIELD LABELS are not props either: they are UI, not merchant
 * copy, so they live in this component's i18n block — the same call as
 * `Hero.vue`'s telemetry panel. What the layout carries is what
 * changes per store: the copy, the subject taxonomy, the hint over the
 * form and the answer time it promises.
 *
 * The artboard's DROPZONE for tender documents is real, and it is a
 * per-store feature: the control renders only while
 * `CONTACT_ATTACHMENTS_ENABLED` is on, and the count, size and
 * accepted types come from the store's own settings rather than from
 * this file (see `useContactAttachments`). A store that does not want
 * anonymous uploads gets the form without the row, and the endpoint
 * 404s to match.
 *
 * One deliberate deviation from the artboard remains: the consent tick
 * is required to submit and is NOT stored: you cannot send an enquiry
 * without it, so the enquiry IS the record, and a column that is
 * `true` on every row states nothing.
 *
 * COLOUR IS TOKENS, NOT LITERALS — see the sibling bands.
 */
const props = defineProps<{
  eyebrow?: string
  heading?: string
  body?: string
  hint?: string
  responseTime?: string
  subjects?: { label: string }[]
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
// SSR-stable, so the radiogroup's label association survives hydration.
const uid = useId()
const toast = useToast()
const { offices } = useStoreOffices()
const { identity } = useMerchantIdentity()
const tenantStore = useTenantStore()
const attachments = useContactAttachments()
const filePicker = useTemplateRef<HTMLInputElement>('filePicker')
const isDropTarget = ref(false)

/**
 * The enquiry's subject, as the artboard's chips.
 *
 * A radiogroup rather than buttons with `aria-pressed`: the four are
 * mutually exclusive and one is always chosen, which is what a radio
 * group means — and it is what makes arrow keys the expected way
 * through them. The first is selected on load, as the artboard shows.
 */
const subjectLabels = computed(() => (props.subjects ?? []).map(s => s.label))
const subject = ref(0)
const chips = ref<(HTMLButtonElement | null)[]>([])

watch(subjectLabels, (labels) => {
  if (subject.value >= labels.length) subject.value = 0
})

function onChipKeydown(event: KeyboardEvent, index: number) {
  const count = subjectLabels.value.length
  if (count < 2) return
  const step = event.key === 'ArrowRight' || event.key === 'ArrowDown'
    ? 1
    : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
  const jump = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : null
  if (!step && jump === null) return
  event.preventDefault()
  const next = jump ?? (index + step + count) % count
  subject.value = next
  chips.value?.[next]?.focus()
}

/**
 * The card's own title is the office's LABEL, so the address under it
 * does not repeat it: the board prints "Γ. Ρίτσου 7, Καλαμαριά 551 32"
 * under "Θεσσαλονίκη", not the city twice. A city that is NOT the
 * label still prints — an office labelled "Έδρα" in a city needs it.
 */
function addressOf(office: {
  label: string
  street: string
  area?: string
  postal?: string
  city?: string
  addressLine: string
}): string {
  if (!office.city || office.city === office.label) {
    const locality = [office.area, office.postal].filter(Boolean).join(' ')
    return [office.street, locality].filter(Boolean).join(', ')
  }
  return office.addressLine
}

/**
 * The same contract the platform's own form posts, plus the three
 * fields Django grew for an enquiry that has a sender behind it. The
 * five-word floor mirrors Django's spam filter
 * (`contact/utils.py::detect_spam_patterns`), so a short-but-real
 * enquiry gets an inline hint instead of an opaque 400.
 */
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

  company: z.string().max(150, { error: t('validation.max', { max: 150 }) })
    .optional(),

  phone: z.string()
    .max(30, { error: t('validation.max', { max: 30 }) })
    .regex(/^[0-9+()\-.\s]*$/, { error: t('panel.phoneInvalid') })
    .optional(),

  message: z.string({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.string.invalid'),
  }).min(10, { error: t('validation.min', { min: 10 }) })
    .max(5000, { error: t('validation.max', { max: 5000 }) })
    .refine(
      value => value.trim().split(/\s+/).filter(Boolean).length >= 5,
      { error: t('validation.message.min_words', { min: 5 }) },
    ),

  consent: z.literal(true, { error: t('panel.consentRequired') }),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
  email: undefined,
  company: undefined,
  phone: undefined,
  message: undefined,
  consent: undefined,
})

const isSubmitting = ref(false)

/**
 * Refusals that never became an upload row, plus the store's own words
 * for a rejection. Kept out of `useContactAttachments` because the
 * wording is UI: the composable reports a CODE, the page says what it
 * means in the visitor's language.
 */
function attachmentMessage(error: AttachmentError): string {
  if (error.code === 'too-large') {
    return t('panel.fileTooLarge', { mb: attachments.maxMegabytes.value })
  }
  if (error.code === 'too-many') {
    return t('panel.fileTooMany', { count: attachments.maxCount.value })
  }
  if (error.code === 'throttled') return t('panel.fileThrottled')
  if (error.code === 'busy') return t('panel.fileBusy')
  if (error.code === 'network') return t('panel.fileNetwork')
  return isDrfFieldErrorMap(error.data)
    ? formatDrfFieldErrors(error.data, t)
    : t('panel.fileRejected')
}

function onFilesPicked(files: FileList | null) {
  if (!files?.length) return
  for (const refusal of attachments.add(Array.from(files))) {
    toast.add({
      title: t('panel.fileNotAdded'),
      description: attachmentMessage(refusal),
      color: 'error',
    })
  }
  // So picking the same file again after removing it still fires
  // `change` — the input keeps its value otherwise.
  if (filePicker.value) filePicker.value.value = ''
}

function onDrop(event: DragEvent) {
  isDropTarget.value = false
  onFilesPicked(event.dataTransfer?.files ?? null)
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (isSubmitting.value) return
  // An upload still in flight has no id yet, and submitting would
  // silently drop it. The button is disabled too; this is the guard
  // for the Enter key.
  if (attachments.isUploading.value) {
    toast.add({ title: t('panel.filesUploading'), color: 'warning' })
    return
  }
  isSubmitting.value = true
  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: {
        name: event.data.name,
        email: event.data.email,
        message: event.data.message,
        company: event.data.company || undefined,
        phone: event.data.phone || undefined,
        // The chip, not a free-text field: it is one of the store's
        // own declared subjects or nothing.
        subject: subjectLabels.value[subject.value],
        // Ids of files already uploaded and not yet claimed. Omitted
        // entirely when there are none, so a store with attachments
        // off never sends the field.
        attachmentIds: attachments.attachmentIds.value.length
          ? attachments.attachmentIds.value
          : undefined,
      },
    })

    toast.add({ title: t('panel.sent'), color: 'success' })
    state.name = undefined
    state.email = undefined
    state.company = undefined
    state.phone = undefined
    state.message = undefined
    state.consent = undefined
    // The ids have been spent: each one is good for one enquiry.
    attachments.reset()
  }
  catch (error) {
    const data = error && typeof error === 'object' && 'data' in error
      ? (error as { data: unknown }).data
      : null
    toast.add({
      title: t('panel.failed'),
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

/** Shared field chrome: the artboard's inputs are the page's ground. */
const FIELD_UI = {
  base: `
    h-[46px] rounded-md border border-default bg-default px-4 text-[14px]
    text-highlighted ring-0 transition-colors
    placeholder:text-dimmed
    focus:border-primary focus-visible:ring-0
  `,
} as const
</script>

<template>
  <section
    class="
      relative border-b border-default bg-default px-5 pt-12 pb-16
      lg:px-20 lg:pt-20 lg:pb-24
    "
  >
    <div
      aria-hidden="true"
      class="
        pointer-events-none absolute inset-0 bg-[image:var(--ds-lattice)]
        bg-[size:80px_80px]
      "
    />

    <div
      class="
        relative mx-auto grid max-w-[1280px] gap-12
        lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:gap-[72px]
      "
    >
      <!-- The copy, the offices, the identity. -->
      <div>
        <p
          v-if="eyebrow"
          class="flex items-center gap-3"
        >
          <span
            aria-hidden="true"
            class="block h-px w-6 bg-primary"
          />
          <span
            class="
              font-mono text-[10px] tracking-[0.2em] text-primary uppercase
            "
          >{{ eyebrow }}</span>
        </p>

        <h1
          v-if="heading"
          class="
            mt-6 text-[32px] leading-[1.12] font-bold tracking-[-0.02em]
            text-highlighted
            lg:text-[40px]
          "
        >
          {{ heading }}
        </h1>

        <p
          v-if="body"
          class="mt-6 max-w-[460px] text-[15px] leading-[1.7] text-muted"
        >
          {{ body }}
        </p>

        <ul
          v-if="offices.length"
          class="mt-10 flex flex-col gap-3"
        >
          <li
            v-for="office in offices"
            :key="office.label"
            class="rounded-xl border border-default bg-muted px-6 py-5"
          >
            <p class="flex items-baseline justify-between gap-4">
              <span class="text-[15px] font-semibold text-highlighted">
                {{ office.label }}
              </span>
              <span
                v-if="office.role"
                class="
                  shrink-0 font-mono text-[10px] tracking-[0.14em] text-primary
                  uppercase
                "
              >{{ office.role }}</span>
            </p>
            <p class="mt-4 flex items-start gap-3">
              <UIcon
                name="i-lucide:map-pin"
                class="mt-0.5 size-4 shrink-0 text-dimmed"
                aria-hidden="true"
              />
              <span class="text-[14px] leading-[1.5] text-muted">
                {{ addressOf(office) }}
              </span>
            </p>
            <p
              v-if="office.phones.length"
              class="mt-3 flex items-start gap-3"
            >
              <UIcon
                name="i-lucide:phone"
                class="mt-0.5 size-4 shrink-0 text-dimmed"
                aria-hidden="true"
              />
              <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <template
                  v-for="(phone, index) in office.phones"
                  :key="phone"
                >
                  <span
                    v-if="index > 0"
                    aria-hidden="true"
                    class="font-mono text-[13.5px] text-dimmed"
                  >·</span>
                  <a
                    :href="`tel:${phone.replace(/\s+/g, '')}`"
                    class="
                      font-mono text-[13.5px] text-muted transition-colors
                      hover:text-highlighted
                    "
                  >{{ phone }}</a>
                </template>
              </span>
            </p>
          </li>
        </ul>

        <p
          v-if="identity?.email"
          class="
            mt-3 flex items-center gap-3 rounded-xl border border-default
            bg-muted px-6 py-4
          "
        >
          <UIcon
            name="i-lucide:mail"
            class="size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <a
            :href="`mailto:${identity?.email}`"
            class="
              text-[14.5px] font-medium text-primary transition-colors
              hover:text-primary/80
            "
          >{{ identity?.email }}</a>
        </p>

        <p
          class="
            mt-5 flex flex-col gap-3 text-[12.5px] text-dimmed
            sm:flex-row sm:items-center sm:justify-between
          "
        >
          <span
            v-if="identity?.registrationNumber"
            class="font-mono"
          >{{ t('panel.gemi') }}: {{ identity?.registrationNumber }}</span>
          <a
            v-if="tenantStore.config?.socialsLinkedin"
            :href="tenantStore.config.socialsLinkedin"
            target="_blank"
            rel="noopener noreferrer"
            class="
              flex items-center gap-1.5 transition-colors
              hover:text-muted
            "
          >
            <UIcon
              name="i-lucide:linkedin"
              class="size-[15px]"
            />
            LinkedIn
          </a>
        </p>
      </div>

      <!-- The enquiry. -->
      <div class="overflow-hidden rounded-xl border border-default">
        <div
          v-if="subjectLabels.length"
          class="
            bg-default px-6 py-7
            lg:px-8
          "
        >
          <p
            :id="`${uid}-subject-label`"
            class="font-mono text-[10px] tracking-[0.16em] text-dimmed uppercase"
          >
            {{ t('panel.subject') }}
          </p>
          <div
            role="radiogroup"
            :aria-labelledby="`${uid}-subject-label`"
            class="mt-4 flex flex-wrap gap-2.5"
          >
            <button
              v-for="(label, index) in subjectLabels"
              :key="label"
              ref="chips"
              type="button"
              role="radio"
              :aria-checked="subject === index"
              :tabindex="subject === index ? 0 : -1"
              class="
                flex h-[40px] cursor-pointer items-center rounded-md px-4
                text-[13.5px] transition-colors
              "
              :class="subject === index
                ? 'bg-primary font-semibold text-inverted'
                : 'border border-default text-default hover:border-accented hover:bg-muted'"
              @click="subject = index"
              @keydown="onChipKeydown($event, index)"
            >
              {{ label }}
            </button>
          </div>
        </div>

        <div
          class="
            border-t border-default bg-muted px-6 py-7
            lg:px-8
          "
        >
          <p
            v-if="hint"
            class="
              mb-7 flex items-start gap-3 rounded-lg border border-primary/30
              bg-primary/5 px-5 py-4 text-[13.5px] leading-[1.6] text-muted
            "
          >
            <UIcon
              name="i-lucide:info"
              class="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            {{ hint }}
          </p>

          <UForm
            :schema="schema"
            :state="state"
            class="flex flex-col gap-5"
            @error="scrollToFirstFormError"
            @submit="onSubmit"
          >
            <div
              class="
                grid gap-5
                sm:grid-cols-2
              "
            >
              <UFormField
                :label="t('panel.name')"
                name="name"
                required
                :ui="{ label: 'text-[13px] text-default' }"
              >
                <UInput
                  v-model="state.name"
                  :placeholder="t('panel.namePlaceholder')"
                  autocomplete="name"
                  variant="none"
                  :ui="FIELD_UI"
                />
              </UFormField>
              <UFormField
                :label="t('panel.company')"
                name="company"
                :ui="{ label: 'text-[13px] text-default' }"
              >
                <UInput
                  v-model="state.company"
                  :placeholder="t('panel.companyPlaceholder')"
                  autocomplete="organization"
                  variant="none"
                  :ui="FIELD_UI"
                />
              </UFormField>
              <UFormField
                :label="t('panel.email')"
                name="email"
                required
                :ui="{ label: 'text-[13px] text-default' }"
              >
                <UInput
                  v-model="state.email"
                  type="email"
                  :placeholder="t('panel.emailPlaceholder')"
                  autocomplete="email"
                  variant="none"
                  :ui="FIELD_UI"
                />
              </UFormField>
              <UFormField
                :label="t('panel.phone')"
                name="phone"
                :ui="{ label: 'text-[13px] text-default' }"
              >
                <UInput
                  v-model="state.phone"
                  type="tel"
                  :placeholder="t('panel.phonePlaceholder')"
                  autocomplete="tel"
                  variant="none"
                  :ui="FIELD_UI"
                />
              </UFormField>
            </div>

            <UFormField
              :label="t('panel.message')"
              name="message"
              required
              :ui="{ label: 'text-[13px] text-default' }"
            >
              <UTextarea
                v-model="state.message"
                :placeholder="t('panel.messagePlaceholder')"
                :rows="7"
                variant="none"
                :ui="{
                  base: `
                    w-full rounded-md border border-default bg-default px-4 py-3
                    text-[14px] leading-[1.6] text-highlighted ring-0
                    transition-colors
                    placeholder:text-dimmed
                    focus:border-primary
                    focus-visible:ring-0
                  `,
                }"
              />
            </UFormField>

            <!-- The artboard's attachment row. Rendered only while
                 the store accepts uploads; the endpoint 404s when it
                 does not, so there is nothing to draw.

                 The input is hidden AND taken out of the tab order:
                 the button below is the labelled control, and leaving
                 both focusable would put an invisible stop before it
                 for every keyboard and screen-reader user. -->
            <div v-if="attachments.enabled.value">
              <p
                class="
                  mb-2 text-[13px] text-default
                "
              >
                {{ t('panel.files') }}
              </p>

              <input
                ref="filePicker"
                type="file"
                class="sr-only"
                :accept="attachments.accept.value || undefined"
                multiple
                tabindex="-1"
                aria-hidden="true"
                @change="onFilesPicked(
                  ($event.target as HTMLInputElement).files,
                )"
              >

              <button
                type="button"
                :disabled="!attachments.canAddMore.value"
                class="
                  flex w-full cursor-pointer items-start gap-3 rounded-lg
                  border border-dashed px-5 py-4 text-left text-[13px]
                  leading-[1.6] transition-colors
                  disabled:cursor-not-allowed disabled:opacity-60
                "
                :class="isDropTarget
                  ? 'border-primary bg-primary/5 text-muted'
                  : 'border-default text-dimmed hover:border-accented'"
                @click="filePicker?.click()"
                @dragover.prevent="isDropTarget = true"
                @dragenter.prevent="isDropTarget = true"
                @dragleave="isDropTarget = false"
                @drop.prevent="onDrop"
              >
                <UIcon
                  name="i-lucide:paperclip"
                  class="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  {{ t('panel.filesPrompt') }}
                  <span class="mt-0.5 block text-[12px] text-dimmed">
                    {{ t('panel.filesLimit', {
                      count: attachments.maxCount.value,
                      mb: attachments.maxMegabytes.value,
                    }) }}
                    <template v-if="attachments.allowedTypes.value.length">
                      · {{ attachments.allowedTypes.value.join(', ') }}
                    </template>
                  </span>
                </span>
              </button>

              <ul
                v-if="attachments.uploads.value.length"
                class="mt-3 flex flex-col gap-2"
              >
                <li
                  v-for="upload in attachments.uploads.value"
                  :key="upload.key"
                  class="
                    rounded-lg border border-default bg-default px-4 py-3
                  "
                >
                  <p class="flex items-center gap-3">
                    <UIcon
                      :name="upload.status === 'done'
                        ? 'i-lucide:check'
                        : upload.status === 'error'
                          ? 'i-lucide:triangle-alert'
                          : 'i-lucide:loader-circle'"
                      class="size-4 shrink-0"
                      :class="upload.status === 'done'
                        ? 'text-primary'
                        : upload.status === 'error'
                          ? 'text-error'
                          : 'animate-spin text-dimmed'"
                      aria-hidden="true"
                    />
                    <span
                      class="
                        min-w-0 flex-1 truncate text-[13px] text-highlighted
                      "
                    >{{ upload.name }}</span>
                    <span class="shrink-0 font-mono text-[11px] text-dimmed">
                      {{ formatAttachmentSize(upload.size, locale) }}
                    </span>
                    <button
                      v-if="upload.status === 'error'"
                      type="button"
                      class="
                        shrink-0 cursor-pointer text-[12px] text-primary
                        transition-colors
                        hover:text-primary/80
                      "
                      @click="attachments.retry(upload.key)"
                    >
                      {{ t('panel.fileRetry') }}
                    </button>
                    <button
                      type="button"
                      class="
                        shrink-0 cursor-pointer text-dimmed transition-colors
                        hover:text-highlighted
                      "
                      :aria-label="t('panel.fileRemove', {
                        name: upload.name,
                      })"
                      @click="attachments.remove(upload.key)"
                    >
                      <UIcon
                        name="i-lucide:x"
                        class="size-4"
                      />
                    </button>
                  </p>

                  <!-- A determinate bar while the bytes move: a 25 MB
                       drawing on a site connection is otherwise
                       indistinguishable from a hung form. -->
                  <UProgress
                    v-if="upload.status === 'uploading'"
                    :model-value="upload.progress"
                    size="sm"
                    class="mt-2.5"
                    :aria-label="t('panel.fileUploading', {
                      name: upload.name,
                    })"
                  />
                  <p
                    v-else-if="upload.status === 'error' && upload.error"
                    class="mt-2 text-[12px] leading-[1.5] text-error"
                  >
                    {{ attachmentMessage(upload.error) }}
                  </p>
                </li>
              </ul>
            </div>

            <UFormField
              name="consent"
              :ui="{ error: 'text-[12px]' }"
            >
              <UCheckbox
                v-model="state.consent"
                required
                :ui="{ label: 'text-[13px] leading-[1.6] text-muted' }"
              >
                <template #label>
                  {{ t('panel.consent') }}
                  <NuxtLink
                    :to="localePath('privacy-policy')"
                    class="
                      text-primary transition-colors
                      hover:text-primary/80
                    "
                  >{{ t('panel.privacy') }}</NuxtLink>.
                </template>
              </UCheckbox>
            </UFormField>

            <div
              class="
                flex flex-col gap-4 border-t border-default pt-6
                sm:flex-row sm:items-center sm:justify-between
              "
            >
              <span
                v-if="responseTime"
                class="font-mono text-[12px] text-dimmed"
              >{{ responseTime }}</span>
              <button
                type="submit"
                :disabled="isSubmitting || attachments.isUploading.value"
                class="
                  flex h-[46px] cursor-pointer items-center justify-center gap-2
                  rounded-md bg-primary px-7 text-[14px] font-semibold
                  text-inverted transition-colors
                  hover:bg-primary/85
                  disabled:cursor-not-allowed disabled:opacity-60
                "
              >
                {{ isSubmitting ? t('panel.sending') : t('panel.submit') }}
                <UIcon
                  v-if="!isSubmitting"
                  name="i-lucide:arrow-right"
                  class="size-4"
                />
              </button>
            </div>
          </UForm>
        </div>
      </div>
    </div>
  </section>
</template>

<i18n lang="yaml">
el:
  panel:
    subject: Θέμα αιτήματος
    name: Ονοματεπώνυμο
    namePlaceholder: Το όνομά σας
    company: Εταιρεία / Φορέας
    companyPlaceholder: π.χ. ΔΕΥΑ, ανάδοχος, βιομηχανία
    email: Email
    # `@` starts a linked message in vue-i18n, so it is escaped.
    emailPlaceholder: "name{'@'}example.gr"
    phone: Τηλέφωνο
    phonePlaceholder: "+30"
    phoneInvalid: Χρησιμοποιήστε ψηφία και + ( ) - μόνο.
    message: Περιγραφή έργου
    messagePlaceholder: Περιγράψτε την εγκατάσταση, τον υπάρχοντα εξοπλισμό και το ζητούμενο αποτέλεσμα…
    files: Συνημμένα
    filesPrompt: Επισυνάψτε τεύχη δημοπράτησης ή σχέδια.
    filesLimit: Έως {count} αρχεία, {mb} MB το καθένα
    filesUploading: Περιμένετε να ολοκληρωθεί η αποστολή των αρχείων.
    fileRetry: Επανάληψη
    fileRemove: "Αφαίρεση {name}"
    fileUploading: "Αποστολή {name}"
    fileNotAdded: Το αρχείο δεν προστέθηκε.
    fileTooLarge: Το αρχείο ξεπερνά το όριο των {mb} MB.
    fileTooMany: Έως {count} αρχεία ανά αίτημα.
    fileThrottled: Πολλές αποστολές αρχείων. Δοκιμάστε σε λίγο.
    fileBusy: Δεν μπορούμε να δεχτούμε αρχεία αυτή τη στιγμή. Δοκιμάστε σε λίγα λεπτά.
    fileNetwork: Η αποστολή του αρχείου διακόπηκε.
    fileRejected: Το αρχείο δεν έγινε δεκτό.
    consent: Συναινώ στην επεξεργασία των στοιχείων μου για την απάντηση στο αίτημά μου, σύμφωνα με την
    privacy: πολιτική απορρήτου
    consentRequired: Χρειαζόμαστε τη συναίνεσή σας για να απαντήσουμε.
    submit: Αποστολή αιτήματος
    sending: Αποστολή…
    sent: Το αίτημά σας στάλθηκε.
    failed: Το αίτημα δεν στάλθηκε.
    gemi: Γ.Ε.ΜΗ.
en:
  panel:
    subject: Enquiry subject
    name: Full name
    namePlaceholder: Your name
    company: Company / organisation
    companyPlaceholder: e.g. water utility, contractor, industry
    email: Email
    emailPlaceholder: "name{'@'}example.com"
    phone: Phone
    phonePlaceholder: "+30"
    phoneInvalid: Use digits and + ( ) - only.
    message: Project description
    messagePlaceholder: Describe the installation, the equipment already there and the result you need…
    files: Attachments
    filesPrompt: Attach tender documents or drawings.
    filesLimit: Up to {count} files, {mb} MB each
    filesUploading: Wait for the files to finish uploading.
    fileRetry: Retry
    fileRemove: "Remove {name}"
    fileUploading: "Uploading {name}"
    fileNotAdded: The file was not added.
    fileTooLarge: The file is larger than the {mb} MB limit.
    fileTooMany: Up to {count} files per enquiry.
    fileThrottled: Too many uploads. Try again shortly.
    fileBusy: Files cannot be accepted right now. Try again in a few minutes.
    fileNetwork: The upload was interrupted.
    fileRejected: The file was not accepted.
    consent: I consent to my details being processed in order to answer my enquiry, in accordance with the
    privacy: privacy policy
    consentRequired: We need your consent in order to answer.
    submit: Send enquiry
    sending: Sending…
    sent: Your enquiry has been sent.
    failed: The enquiry was not sent.
    gemi: General Commercial Registry
</i18n>
