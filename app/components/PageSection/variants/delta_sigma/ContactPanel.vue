<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

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
 * Two deliberate deviations from the artboard, both flagged to the
 * operator rather than faked:
 *
 * * It draws a 25 MB DROPZONE for tender documents. Anonymous file
 *   upload is not something this platform has (no endpoint, no
 *   storage, no scanning), and inventing one for a marketing page is
 *   a decision for the operator, not a rendering detail. The row is
 *   rendered as what it can actually do — email the documents — and
 *   says so in one line rather than accepting a file it would drop.
 * * The consent tick is required to submit and is NOT stored: you
 *   cannot send an enquiry without it, so the enquiry IS the record,
 *   and a column that is `true` on every row states nothing.
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

const { t } = useI18n()
const localePath = useLocalePath()
// SSR-stable, so the radiogroup's label association survives hydration.
const uid = useId()
const toast = useToast()
const { offices } = useStoreOffices()
const { identity } = useMerchantIdentity()
const tenantStore = useTenantStore()

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

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (isSubmitting.value) return
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
      },
    })

    toast.add({ title: t('panel.sent'), color: 'success' })
    state.name = undefined
    state.email = undefined
    state.company = undefined
    state.phone = undefined
    state.message = undefined
    state.consent = undefined
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
              <span class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <a
                  v-for="phone in office.phones"
                  :key="phone"
                  :href="`tel:${phone.replace(/\s+/g, '')}`"
                  class="
                    font-mono text-[13.5px] text-muted transition-colors
                    hover:text-highlighted
                  "
                >{{ phone }}</a>
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

            <!-- The artboard's attachment row, as what it can do. See
                 the note at the top of this file. -->
            <p
              v-if="identity?.email"
              class="
                flex items-start gap-3 rounded-lg border border-dashed
                border-default px-5 py-4 text-[13px] leading-[1.6] text-dimmed
              "
            >
              <UIcon
                name="i-lucide:paperclip"
                class="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span>
                {{ t('panel.attachments') }}
                <a
                  :href="`mailto:${identity?.email}`"
                  class="
                    text-primary transition-colors
                    hover:text-primary/80
                  "
                >{{ identity?.email }}</a>
              </span>
            </p>

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
                :disabled="isSubmitting"
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
    attachments: "Τεύχη δημοπράτησης ή σχέδια: στείλτε τα στο"
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
    attachments: "Tender documents or drawings: send them to"
    consent: I consent to my details being processed in order to answer my enquiry, in accordance with the
    privacy: privacy policy
    consentRequired: We need your consent in order to answer.
    submit: Send enquiry
    sending: Sending…
    sent: Your enquiry has been sent.
    failed: The enquiry was not sent.
    gemi: General Commercial Registry
</i18n>
