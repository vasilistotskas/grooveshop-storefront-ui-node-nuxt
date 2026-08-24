<script lang="ts" setup>
import * as z from 'zod'

const { t } = useI18n()
const toast = useToast()

const loading = ref(false)

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
    .max(5, { error: t('validation.max', { max: 5 }) }),

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

async function onSubmit(values: FeedbackValues) {
  if (loading.value) return
  loading.value = true
  try {
    await $fetch('/api/feedback', {
      method: 'POST',
      body: values,
    })

    toast.add({
      title: t('success.title'),
      description: t('success.description'),
      color: 'success',
    })
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

const formSchema = computed(() => ({
  fields: [
    {
      label: t('rating'),
      name: 'rating',
      as: 'rating',
      rules: feedbackZodSchema.shape.rating,
      autocomplete: 'off',
      readonly: false,
      required: true,
      placeholder: '',
      type: 'number',
      color: 'warning',
      condition: () => true,
      disabledCondition: () => false,
    },
    {
      label: t('category.label'),
      name: 'category',
      as: 'select',
      rules: feedbackZodSchema.shape.category,
      autocomplete: 'off',
      readonly: false,
      required: false,
      placeholder: t('category.placeholder'),
      type: 'text',
      initialValue: 'general',
      ui: { root: 'w-full' },
      children: CATEGORY_VALUES.map(value => ({
        tag: 'option',
        as: 'option',
        text: t(`category.${value}`),
        value,
      })),
      condition: () => true,
      disabledCondition: () => false,
    },
    {
      label: t('message'),
      name: 'message',
      as: 'textarea',
      rules: feedbackZodSchema.shape.message,
      autocomplete: 'off',
      readonly: false,
      required: true,
      placeholder: t('message_placeholder'),
      type: 'text',
      ui: { root: 'w-full' },
      condition: () => true,
      disabledCondition: () => false,
    },
    {
      label: t('name'),
      name: 'name',
      as: 'input',
      rules: feedbackZodSchema.shape.name,
      autocomplete: 'name',
      readonly: false,
      required: false,
      placeholder: t('name_placeholder'),
      type: 'text',
      ui: { root: 'w-full' },
      condition: () => true,
      disabledCondition: () => false,
    },
    {
      label: t('email.label'),
      name: 'email',
      as: 'input',
      rules: feedbackZodSchema.shape.email,
      autocomplete: 'email',
      readonly: false,
      required: false,
      placeholder: t('email.placeholder'),
      type: 'email',
      ui: { root: 'w-full' },
      condition: () => true,
      disabledCondition: () => false,
    },
  ],
} as const satisfies DynamicFormSchema))
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
      <UCard class="shadow-lg">
        <DynamicForm
          class="!flex flex-col"
          :button-label="t('submit')"
          :schema="formSchema"
          :loading="loading"
          reset-on-submit
          @submit="onSubmit"
        />
      </UCard>
    </div>
  </section>
</template>

<i18n lang="yaml">
el:
  rating: Πόσο ικανοποιημένος/η είσαι;
  message: Τα σχόλιά σου
  message_placeholder: Πες μας τι σκέφτεσαι — τι σου άρεσε ή τι θα μπορούσαμε να βελτιώσουμε.
  name: Όνομα (προαιρετικό)
  name_placeholder: Το όνομά σου
  email:
    label: Email (προαιρετικό)
    placeholder: Το email σου, αν θέλεις να επικοινωνήσουμε μαζί σου
  category:
    label: Κατηγορία
    placeholder: Επίλεξε κατηγορία
    general: Γενικά
    website: Ιστότοπος & Εμπειρία
    products: Προϊόντα
    delivery: Παράδοση
    support: Εξυπηρέτηση πελατών
    other: Άλλο
  submit: Αποστολή σχολίων
  success:
    title: Ευχαριστούμε για τα σχόλιά σου!
    description: Λάβαμε τα σχόλιά σου και θα τα λάβουμε υπόψη.
  error:
    default: Κάτι πήγε στραβά. Δοκίμασε ξανά.
</i18n>
