<script lang="ts" setup>
import * as z from 'zod'

/**
 * Feedback, one question at a time: what it is about, how it went, the
 * words, then optionally a name and an email. Five questions over the
 * feedback endpoint's five fields; every step asks for its own field
 * before Next lets the visitor on, and the last one sends.
 */
const { t } = useI18n()
const toast = useToast()

const loading = ref(false)
const sent = ref(false)

// Mirrors the Django FeedbackWriteSerializer / validate_feedback_content
// rules so the user gets inline hints instead of an opaque 400. rating
// is required (undefined -> required); email is optional and accepts an
// empty string (anonymous feedback); message mirrors the contact spam
// filter's >= 5 words rule (contact/utils.py detect_spam_patterns).
const CATEGORY_VALUES = [
  'general',
  'website',
  'products',
  'delivery',
  'support',
  'other',
] as const

const feedbackZodSchema = z.object({
  rating: z.number({
    error: () => t('validation.required'),
  })
    .int({ error: () => t('validation.required') })
    .min(1, { error: t('validation.required') })
    .max(5, { error: t('validation.max_value', { max: 5 }) }),

  category: z.enum(CATEGORY_VALUES),

  message: z.string({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.string.invalid'),
  })
    .min(10, { error: t('validation.min', { min: 10 }) })
    .max(5000, { error: t('validation.max', { max: 5000 }) })
    .refine(
      value => value.trim().split(/\s+/).filter(Boolean).length >= 5,
      { error: t('validation.message.min_words', { min: 5 }) },
    ),

  name: z.string()
    .max(100, { error: t('validation.max', { max: 100 }) })
    .optional(),

  email: z.union([
    z.email({ error: t('validation.email.valid') }).max(254),
    z.literal(''),
  ]).optional(),
})

type FeedbackValues = z.output<typeof feedbackZodSchema>

// One question per field, in the order they are asked.
const STEPS = ['category', 'rating', 'message', 'name', 'email'] as const
type Step = (typeof STEPS)[number]

const index = ref(0)
const step = computed<Step>(() => STEPS[index.value]!)
const isLast = computed(() => index.value === STEPS.length - 1)
const percent = computed(() => Math.round(((index.value + 1) / STEPS.length) * 100))

const state = reactive<{
  rating?: number
  category: (typeof CATEGORY_VALUES)[number]
  message?: string
  name?: string
  email?: string
}>({
  rating: undefined,
  category: 'general',
  message: undefined,
  name: undefined,
  email: undefined,
})

const categoryItems = computed(() =>
  CATEGORY_VALUES.map(value => ({ value, label: t(`category.${value}`) })))

// The rating is a number in the payload and a string in the radio group.
const ratingChoice = computed({
  get: () => (state.rating === undefined ? undefined : String(state.rating)),
  set: (value) => {
    state.rating = value === undefined ? undefined : Number(value)
  },
})
const ratingItems = computed(() =>
  [1, 2, 3, 4, 5].map(value => ({ value: String(value), label: String(value), word: t(`rating_words.${value}`) })))

const formRef = useTemplateRef<{
  validate: (opts?: { name?: string | string[] }) => Promise<unknown>
}>('formRef')

async function next() {
  try {
    await formRef.value?.validate({ name: step.value })
  }
  catch {
    // UForm has put the message on the field.
    return
  }
  if (isLast.value) {
    await submit()
    return
  }
  index.value += 1
}

// Enter in a one-line field is "Next". The form's own submit would ask
// for every field of the schema at once, which is not this step's job.
function onEnter(event: KeyboardEvent) {
  if ((event.target as HTMLElement).tagName === 'TEXTAREA') return
  event.preventDefault()
  void next()
}

function back() {
  if (index.value > 0) index.value -= 1
}

async function submit() {
  if (loading.value) return
  loading.value = true
  try {
    const values = feedbackZodSchema.parse(state) satisfies FeedbackValues
    await $api('/api/feedback', {
      method: 'POST',
      body: values,
    })

    toast.add({
      title: t('success.title'),
      description: t('success.description'),
      color: 'success',
    })
    sent.value = true
  }
  catch (error) {
    // The proxy forwards Django's 4xx validation body — surface the
    // field detail (spam filter, disposable email, …) instead of a
    // blanket failure. Same handling as ContactForm.vue.
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
    loading.value = false
  }
}

function again() {
  state.rating = undefined
  state.category = 'general'
  state.message = undefined
  state.name = undefined
  state.email = undefined
  index.value = 0
  sent.value = false
}
</script>

<template>
  <section
    class="
      flex flex-col gap-6 rounded-[1.25rem] bg-default p-5 ring ring-default
      sm:p-6
    "
  >
    <div
      v-if="sent"
      class="flex flex-col items-start gap-3 py-4"
    >
      <span class="flex size-12 items-center justify-center rounded-xl bg-(--ui-success-soft)">
        <UIcon
          name="i-lucide-check"
          class="size-6 text-highlighted"
          aria-hidden="true"
        />
      </span>
      <h2 class="font-display text-2xl font-bold text-highlighted">
        {{ t('success.title') }}
      </h2>
      <p class="text-toned">
        {{ t('success.description') }}
      </p>
      <UButton
        color="neutral"
        variant="outline"
        :label="t('again')"
        @click="again"
      />
    </div>

    <template v-else>
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between text-sm font-medium text-highlighted">
          <span>{{ t('progress', { current: index + 1, total: STEPS.length }) }}</span>
          <span class="font-mono text-xs text-toned">{{ percent }}%</span>
        </div>
        <UProgress
          :model-value="percent"
          size="sm"
          color="secondary"
          :aria-label="t('progress', { current: index + 1, total: STEPS.length })"
        />
      </div>

      <UForm
        ref="formRef"
        :state="state"
        :schema="feedbackZodSchema"
        class="flex flex-col gap-6"
        @keydown.enter="onEnter"
        @submit.prevent
      >
        <h2 class="font-display text-2xl font-bold text-highlighted">
          {{ t(`questions.${step}`) }}
        </h2>

        <UFormField
          v-if="step === 'category'"
          name="category"
        >
          <URadioGroup
            v-model="state.category"
            :items="categoryItems"
            variant="card"
            indicator="hidden"
            :legend="t('questions.category')"
            :ui="{ legend: 'sr-only', fieldset: `
              grid gap-2
              sm:grid-cols-2
            ` }"
          />
        </UFormField>

        <UFormField
          v-else-if="step === 'rating'"
          name="rating"
        >
          <URadioGroup
            v-model="ratingChoice"
            :items="ratingItems"
            variant="card"
            indicator="hidden"
            orientation="horizontal"
            :legend="t('questions.rating')"
            :ui="{ legend: 'sr-only', fieldset: 'grid grid-cols-5 gap-2', item: `
              justify-center p-3 text-center
            ` }"
          >
            <template #label="{ item }">
              <span class="flex flex-col items-center gap-1">
                <span class="font-mono text-xl font-semibold text-highlighted">{{ item.label }}</span>
                <span class="text-xs font-semibold text-toned">{{ (item as typeof ratingItems[number]).word }}</span>
              </span>
            </template>
          </URadioGroup>
        </UFormField>

        <UFormField
          v-else-if="step === 'message'"
          name="message"
        >
          <UTextarea
            v-model="state.message"
            :rows="5"
            :placeholder="t('message_placeholder')"
            :aria-label="t('questions.message')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-else-if="step === 'name'"
          name="name"
        >
          <UInput
            v-model="state.name"
            autocomplete="name"
            :placeholder="t('name_placeholder')"
            :aria-label="t('questions.name')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          v-else
          name="email"
        >
          <UInput
            v-model="state.email"
            type="email"
            autocomplete="email"
            :placeholder="t('email_placeholder')"
            :aria-label="t('questions.email')"
            class="w-full"
          />
        </UFormField>

        <div class="flex items-center justify-between gap-3">
          <UButton
            v-if="index > 0"
            color="neutral"
            variant="ghost"
            size="lg"
            icon="i-lucide-chevron-left"
            :label="t('back')"
            @click="back"
          />
          <span v-else />
          <UButton
            color="neutral"
            size="lg"
            :loading="loading"
            :trailing-icon="isLast ? undefined : 'i-lucide-arrow-right'"
            :label="isLast ? t('submit') : t('next')"
            @click="next"
          />
        </div>
      </UForm>
    </template>
  </section>
</template>

<i18n lang="yaml">
el:
  progress: 'Ερώτηση {current} από {total}'
  questions:
    category: Για τι αφορούν τα σχόλιά σου;
    rating: Πώς ήταν η εμπειρία σου συνολικά;
    message: Τι θέλεις να μας πεις;
    name: Πώς να σε λέμε; (προαιρετικό)
    email: Πού μπορούμε να σε βρούμε; (προαιρετικό)
  rating_words:
    1: Απαίσια
    2: Έτσι κι έτσι
    3: Μέτρια
    4: Καλή
    5: Εξαιρετική
  message_placeholder: Τι σου άρεσε ή τι θα μπορούσαμε να κάνουμε καλύτερα;
  name_placeholder: Το όνομά σου
  email_placeholder: Το email σου, αν θέλεις να σου απαντήσουμε
  category:
    general: Γενικά
    website: Ιστότοπος & Εμπειρία
    products: Προϊόντα
    delivery: Παράδοση
    support: Εξυπηρέτηση πελατών
    other: Άλλο
  back: Πίσω
  next: Επόμενο
  submit: Αποστολή σχολίων
  again: Νέα αποστολή
  success:
    title: Ευχαριστούμε για τα σχόλιά σου!
    description: Λάβαμε τα σχόλιά σου και θα τα λάβουμε υπόψη.
  error:
    default: Κάτι πήγε στραβά. Δοκίμασε ξανά.
en:
  progress: 'Question {current} of {total}'
  questions:
    category: What is your feedback about?
    rating: Overall, how was your experience?
    message: What would you like to tell us?
    name: What should we call you? (optional)
    email: Where can we reach you? (optional)
  rating_words:
    1: Awful
    2: Meh
    3: OK
    4: Good
    5: Great
  message_placeholder: What did you like, or what could we do better?
  name_placeholder: Your name
  email_placeholder: Your email, if you would like a reply
  category:
    general: General
    website: Site & experience
    products: Products
    delivery: Delivery
    support: Customer service
    other: Other
  back: Back
  next: Next
  submit: Send feedback
  again: Send more feedback
  success:
    title: Thank you for your feedback!
    description: We have received your comments and will take them into account.
  error:
    default: Something went wrong. Please try again.
</i18n>
