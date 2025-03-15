<script lang="ts" setup>
import * as z from 'zod'

const emit = defineEmits(['providerSignup'])

const { providerSignup } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()
const { $i18n } = useNuxtApp()

const loading = ref(false)

async function onSubmit(values: ProviderSignupBody) {
  try {
    loading.value = true
    await providerSignup(values)
    toast.add({
      title: t('success.title'),
      color: 'green',
    })
    emit('providerSignup')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t('email.title'),
      name: 'email',
      as: 'input',
      rules: z.string({ required_error: $i18n.t('validation.required') }).email($i18n.t('validation.email.valid')),
      autocomplete: 'email',
      readonly: false,
      required: true,
      placeholder: t('email.title'),
      type: 'email',
    },
  ],
}
</script>

<template>
  <div
    class="
      container-2xs p-0

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
