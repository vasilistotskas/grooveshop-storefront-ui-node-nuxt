<script lang="ts" setup>
const { t } = useStoreI18n('components/variants/webside/FeedbackForm')
const { schema: feedbackZodSchema, loading, send } = useFeedbackSubmit({ t })

async function onSubmit(values: unknown) {
  await send(values)
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
      children: FEEDBACK_CATEGORIES.map(value => ({
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
en:
  rating: How satisfied are you?
  message: Your comments
  message_placeholder: Tell us what you think — what you liked, or what we could do better.
  name: Name (optional)
  name_placeholder: Your name
  email:
    label: Email (optional)
    placeholder: Your email, if you would like us to get back to you
  category:
    label: Category
    placeholder: Choose a category
    general: General
    website: Site & experience
    products: Products
    delivery: Delivery
    support: Customer service
    other: Other
  submit: Send feedback
  success:
    title: Thank you for your feedback!
    description: We have received your comments and will take them into account.
  error:
    default: Something went wrong. Please try again.
</i18n>
