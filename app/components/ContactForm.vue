<script lang="ts" setup>
import * as z from 'zod'

const { t } = useI18n()
const toast = useToast()
const { $i18n } = useNuxtApp()

const loading = ref(false)

async function onSubmit(values: ContactBody) {
  loading.value = true
  try {
    await $fetch<Contact>(
      'api/contact',
      {
        method: 'POST',
        body: values,
      },
    )
    toast.add({
      title: t('success.title'),
      color: 'green',
    })
  }
  catch {
    toast.add({
      title: t('error.default'),
      color: 'red',
    })
  }
  finally {
    loading.value = false
  }
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t('name'),
      name: 'name',
      as: 'input',
      rules: z.string({ required_error: $i18n.t('validation.required') }).min(2),
      autocomplete: 'name',
      readonly: false,
      required: true,
      placeholder: t('name'),
      type: 'text',
    },
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
    {
      label: t('message'),
      name: 'message',
      as: 'textarea',
      rules: z.string({ required_error: $i18n.t('validation.required') }).min(10),
      autocomplete: 'message',
      readonly: false,
      required: true,
      placeholder: t('message'),
      type: 'text',
    },
  ],
}
</script>

<template>
  <section class="container-3xs">
    <DynamicForm
      :button-label="$i18n.t('submit')"
      :loading="loading"
      :schema="formSchema"
      class="grid"
      @submit="onSubmit"
    />
  </section>
</template>
