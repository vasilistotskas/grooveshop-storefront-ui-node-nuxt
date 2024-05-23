<script lang="ts" setup>
import { z } from 'zod'

import type { DynamicFormSchema } from '~/types/form'
import type { TwoFaAuthenticateBody } from '~/types/all-auth'

const { twoFaAuthenticate } = useAllAuthAuthentication()

const { t } = useI18n()

async function onSubmit(values: TwoFaAuthenticateBody) {
  await twoFaAuthenticate(values)
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t('pages.account.security.mfa.totp.authenticate.form.code.label'),
      name: 'code',
      as: 'input',
      rules: z.string({ required_error: t('common.validation.required') }).min(6).max(6),
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
  <div
    class="
      container-2xs p-0

      md:px-6
    "
  >
    <section class="grid items-center">
      <DynamicForm
        :schema="formSchema"
        :button-label="t('common.submit')"
        @submit="onSubmit"
      />
    </section>
  </div>
</template>
