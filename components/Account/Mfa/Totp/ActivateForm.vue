<script lang="ts" setup>
import { z } from 'zod'

import type { MfaTotpActivatePostBody } from '~/types/auth'
import type { DynamicFormSchema } from '~/types/form'

const { totpActivatePost } = useAuthMfa()
const { fetch } = useUserSession()
const { t } = useI18n()
const toast = useToast()

function onSubmit(values: MfaTotpActivatePostBody) {
  totpActivatePost(values)
    .then(async () => {
      toast.add({
        title: t('pages.account.security.mfa.totp.activate.success'),
        color: 'green',
      })
      await fetch()
      await navigateTo('/account')
    })
    .catch(() => {
      toast.add({
        title: t('pages.account.security.mfa.totp.activate.error'),
        color: 'red',
      })
    })
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t('pages.account.security.mfa.totp.activate.form.code.label'),
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
  <section class="grid items-center justify-center justify-items-center">
    <DynamicForm
      :schema="formSchema"
      class="grid"
      :button-label="t('common.entry')"
      @submit="onSubmit"
    />
  </section>
</template>
