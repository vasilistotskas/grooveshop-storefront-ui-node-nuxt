<script lang="ts" setup>
import * as z from 'zod'

const emit = defineEmits(['providerSignup'])

const { providerSignup } = useAllAuthAuthentication()
const toast = useToast()
const { $i18n } = useNuxtApp()

const loading = ref(false)

const providerSignupZodSchema = z.object({
  email: z.email({
    error: issue => issue.input === undefined
      ? $i18n.t('validation.required')
      : $i18n.t('validation.email.valid'),
  }),
})

async function onSubmit(values: z.infer<typeof providerSignupZodSchema>) {
  try {
    loading.value = true
    await providerSignup(values) // Properly typed as { email: string }
    toast.add({
      title: $i18n.t('success.title'),
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
      label: $i18n.t('email.title'),
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
      placeholder: $i18n.t('email.title'),
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
        :button-label="$i18n.t('submit')"
        :schema="formSchema"
        @submit="onSubmit"
      />
    </section>
  </div>
</template>
