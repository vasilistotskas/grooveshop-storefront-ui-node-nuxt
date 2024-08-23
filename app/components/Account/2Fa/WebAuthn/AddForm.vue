<script lang="ts" setup>
import {
  create,
  parseCreationOptionsFromJSON,
} from '@github/webauthn-json/browser-ponyfill'
import { z } from 'zod'
import type { DynamicFormSchema } from '~/types/form'

const emit = defineEmits(['getWebAuthnCreateOptions', 'addWebAuthnCredential'])

const { getWebAuthnCreateOptions, addWebAuthnCredential } = useAllAuthAccount()

const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()

const loading = ref(false)

async function onSubmit(values: {
  name: string
  passwordless: boolean
}) {
  try {
    if (import.meta.client) {
      loading.value = true
      const optResp = await getWebAuthnCreateOptions(values.passwordless)
      const jsonOptions = optResp?.data.creation_options
      if (!jsonOptions) {
        throw new Error('No creation options')
      }
      const options = parseCreationOptionsFromJSON(jsonOptions)
      const credential = await create(options)
      const response = await addWebAuthnCredential({
        name: values.name,
        credential,
      })
      toast.add({
        title: t('common.success.title'),
        color: 'green',
      })
      emit('getWebAuthnCreateOptions')
      emit('addWebAuthnCredential')
      const to = response?.meta.recovery_codes_generated ? '/account/2fa/recovery-codes' : '/account/2fa/webauthn'
      await navigateTo(localePath(to))
    }
  }
  catch (error) {
    console.error('=== Error ===', error)
    toast.add({
      title: t('common.error.default'),
      color: 'red',
    })
  }
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t('common.name'),
      name: 'name',
      as: 'input',
      rules: z.string({ required_error: t('common.validation.required') }),
      autocomplete: 'name',
      readonly: false,
      required: true,
      placeholder: t('common.name'),
      type: 'text',
    },
    {
      label: t('common.passwordless'),
      name: 'passwordless',
      as: 'checkbox',
      rules: z.boolean(),
      autocomplete: 'passwordless',
      readonly: false,
      required: false,
      placeholder: t('common.passwordless'),
      type: 'checkbox',
    },
  ],
}
</script>

<template>
  <section class="grid items-center">
    <DynamicForm
      :button-label="t('common.submit')"
      :schema="formSchema"
      @submit="onSubmit"
    />
  </section>
</template>
