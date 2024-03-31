<script lang="ts" setup>
import { z } from 'zod'

import type { MfaTotpAuthenticateBody } from '~/types/auth'
import type { DynamicFormSchema } from '~/types/form'

const { totpAuthenticate } = useAuthMfa()

const { t } = useI18n()

async function onSubmit(values: MfaTotpAuthenticateBody) {
  await totpAuthenticate(values)
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t('pages.auth.security.mfa.totp.authenticate.form.code.label'),
      name: 'code',
      as: 'input',
      rules: z.string().min(6).max(6),
      autocomplete: 'one-time-code',
      readonly: false,
      required: true,
      placeholder: '123456',
      type: 'text',
    },
  ],
}
</script>

<template>
  <div class="container-2xs p-0 md:px-6">
    <section class="grid items-center">
      <DynamicForm :schema="formSchema" @submit="onSubmit" />
    </section>
  </div>
</template>
