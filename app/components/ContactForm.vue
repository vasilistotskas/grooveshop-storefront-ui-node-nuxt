<script lang="ts" setup>
import * as z from 'zod'

const { t } = useI18n()
const toast = useToast()
const { $i18n } = useNuxtApp()

const loading = ref(false)

async function onSubmit(values: ContactWriteRequest) {
  loading.value = true
  try {
    await $fetch(
      'api/contact',
      {
        method: 'POST',
        body: values,
      },
    )
    toast.add({
      title: $i18n.t('success.title'),
      color: 'success',
    })
  }
  catch {
    toast.add({
      title: $i18n.t('error.default'),
      color: 'error',
    })
  }
  finally {
    loading.value = false
  }
}

const formSchema = computed<DynamicFormSchema>(() => ({
  fields: [
    {
      label: t('name'),
      name: 'name',
      as: 'input',
      rules: z.string({ error: issue => issue.input === undefined
        ? $i18n.t('validation.required')
        : $i18n.t('validation.string.invalid') }).min(2),
      autocomplete: 'name',
      readonly: false,
      required: true,
      placeholder: t('name'),
      type: 'text',
      condition: () => true,
      disabledCondition: () => false,
    },
    {
      label: $i18n.t('email.title'),
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
    {
      label: t('message'),
      name: 'message',
      as: 'textarea',
      rules: z.string({ error: issue => issue.input === undefined
        ? $i18n.t('validation.required')
        : $i18n.t('validation.string.invalid') }).min(10),
      autocomplete: 'message',
      readonly: false,
      required: true,
      placeholder: t('message'),
      type: 'text',
      condition: () => true,
      disabledCondition: () => false,
    },
  ],
}))
</script>

<template>
  <section class="container mx-auto">
    <DynamicForm
      :button-label="$i18n.t('submit')"
      :loading="loading"
      :schema="formSchema"
      class="grid"
      @submit="onSubmit"
    />
  </section>
</template>
