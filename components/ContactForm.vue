<script lang="ts" setup>
import { z } from 'zod'

import type { DynamicFormSchema } from '~/types/form'
import type { ContactBody } from '~/types/contact'

const { t } = useI18n()
const toast = useToast()

const loading = ref(false)

async function onSubmit(values: ContactBody) {
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
      title: t('common.success.title'),
      color: 'green',
    })
  }
  catch (error) {
    toast.add({
      title: t('common.error.default'),
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
      label: t('common.name'),
      name: 'name',
      as: 'input',
      rules: z.string({ required_error: t('common.validation.required') }).min(2),
      autocomplete: 'name',
      readonly: false,
      required: true,
      placeholder: t('common.name'),
      type: 'text',
    },
    {
      label: t('common.email.title'),
      name: 'email',
      as: 'input',
      rules: z.string({ required_error: t('common.validation.required') }).email(t('common.validation.email.valid')),
      autocomplete: 'email',
      readonly: false,
      required: true,
      placeholder: t('common.email.title'),
      type: 'email',
    },
    {
      label: t('common.message'),
      name: 'message',
      as: 'textarea',
      rules: z.string({ required_error: t('common.validation.required') }).min(10),
      autocomplete: 'message',
      readonly: false,
      required: true,
      placeholder: t('common.message'),
      type: 'text',
    },
  ],
}
</script>

<template>
  <section class="container-3xs">
    <DynamicForm
      :button-label="t('common.submit')"
      :loading="loading"
      :schema="formSchema"
      class="grid"
      @submit="onSubmit"
    />
  </section>
</template>
