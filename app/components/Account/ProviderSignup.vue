<script lang="ts" setup>
import * as z from 'zod'

const { t } = useI18n()
const emit = defineEmits(['providerSignup'])

const { providerSignup } = useAllAuthAuthentication()
const toast = useToast()

const loading = ref(false)

const providerSignupZodSchema = z.object({
  email: z.email({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.email.valid'),
  }),
})

async function onSubmit(values: z.infer<typeof providerSignupZodSchema>) {
  try {
    loading.value = true
    await providerSignup(values) // Properly typed as { email: string }
    toast.add({
      title: t('success.title'),
      color: 'success',
    })
    emit('providerSignup')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
}

const formSchema = computed(() => ({
  fields: [
    {
      label: t('email.title'),
      name: 'email',
      as: 'input',
      rules: providerSignupZodSchema.shape.email,
      ui: {
        root: 'w-full',
      },
      autocomplete: 'email',
      readonly: false,
      required: true,
      condition: () => true,
      disabledCondition: () => false,
      placeholder: t('email.title'),
      type: 'email',
    },
  ],
} as const satisfies DynamicFormSchema))
</script>

<template>
  <div
    class="
      container mx-auto p-0
      md:px-6
    "
  >
    <section class="grid items-center">
      <DynamicForm
        :button-label="t('submit')"
        :schema="formSchema"
        @submit="onSubmit"
      />
    </section>
  </div>
</template>
