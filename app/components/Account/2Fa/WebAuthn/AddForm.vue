<script lang="ts" setup>
import {
  create,
  parseCreationOptionsFromJSON,
} from '@github/webauthn-json/browser-ponyfill'
import * as z from 'zod'
import type { CredentialCreationOptionsJSON } from '@github/webauthn-json/dist/types/basic/json'
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
    loading.value = true
    const optResp = await getWebAuthnCreateOptions(values.passwordless)
    const jsonOptions = optResp?.data.creation_options as CredentialCreationOptionsJSON
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
      title: t('success.title'),
      color: 'green',
    })
    emit('getWebAuthnCreateOptions')
    emit('addWebAuthnCredential')
    const to = response?.meta.recovery_codes_generated ? '/account/2fa/recovery-codes' : '/account/2fa/webauthn'
    await navigateTo(localePath(to))
  }
  catch {
    toast.add({
      title: t('error.default'),
      color: 'red',
    })
  }
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t('name'),
      name: 'name',
      as: 'input',
      rules: z.string({ required_error: t('validation.required') }),
      autocomplete: 'name',
      readonly: false,
      required: true,
      placeholder: t('name'),
      type: 'text',
    },
    {
      label: t('passwordless'),
      name: 'passwordless',
      as: 'checkbox',
      rules: z.boolean(),
      autocomplete: 'passwordless',
      readonly: false,
      required: false,
      placeholder: t('passwordless'),
      type: 'checkbox',
      initialValue: false,
    },
  ],
}
</script>

<template>
  <section
    class="
      grid gap-4

      lg:flex
    "
  >
    <slot />
    <DynamicForm
      class="!flex flex-col"
      :button-label="t('submit')"
      :schema="formSchema"
      @submit="onSubmit"
    />
  </section>
</template>
