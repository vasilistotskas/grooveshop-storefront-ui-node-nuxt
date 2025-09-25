<script lang="ts" setup>
import * as z from 'zod'

const emit = defineEmits(['passwordRequest'])

const { passwordRequest } = useAllAuthAuthentication()
const toast = useToast()
const { $i18n } = useNuxtApp()

const loading = ref(false)

async function onSubmit(values: PasswordRequestBody) {
  try {
    loading.value = true
    await passwordRequest({
      email: values.email,
    })
    toast.add({
      title: $i18n.t('password.reset.request.success'),
      color: 'success',
    })
    emit('passwordRequest')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    finalizeReset()
  }
}

function finalizeReset() {
  loading.value = false
}

const formSchema = computed<DynamicFormSchema>(() => ({
  fields: [
    {
      name: 'email',
      as: 'input',
      rules: z.email({
        error: issue => issue.input === undefined
          ? $i18n.t('validation.required')
          : $i18n.t('validation.email.valid'),
      }),
      autocomplete: 'email',
      readonly: false,
      required: true,
      placeholder: $i18n.t('email.title'),
      type: 'email',
      condition: () => true,
      disabledCondition: () => false,
    },
  ],
}))
</script>

<template>
  <section class="grid">
    <DynamicForm
      :button-label="$i18n.t('reset')"
      :loading="loading"
      :schema="formSchema"
      @submit="onSubmit"
    />
  </section>
</template>
