<script lang="ts" setup>
import { z } from 'zod'

import type { RegistrationResendEmailBody } from '~/types/auth'
import type { DynamicFormSchema } from '~/types/form'

const { registrationVerifyEmail, registrationResendEmail } = useAuth()
const { t } = useI18n()
const route = useRoute('auth-registration-account-confirm-email-id___en')
const id = route.params.id

const data = await registrationVerifyEmail({
  key: id,
})

async function onSubmit(values: RegistrationResendEmailBody) {
  await registrationResendEmail({
    email: values.email,
  })
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t(
        'pages.auth.registration.account-confirm-email.resend.form.email.label',
      ),
      name: 'email',
      as: 'input',
      rules: z.string().email(),
      autocomplete: 'email',
      readonly: false,
      required: true,
      placeholder: '',
      type: 'email',
    },
  ],
}

definePageMeta({
  layout: 'default',
  middleware: 'guest',
})
</script>

<template>
  <PageWrapper class="container-xxs grid gap-12">
    <PageTitle
      :text="$t('pages.auth.registration.account-confirm-email.title')"
      class="text-center capitalize"
    />
    <PageBody>
      <ClientOnly>
        <LazyAlert
          v-if="data"
          :title="`${$t('pages.auth.registration.account-confirm-email.success.title')}`"
          :text="
            $t(
              'pages.auth.registration.account-confirm-email.success.description',
            )
          "
          :type="`success`"
          :close-button="false"
        />
        <LazyAlert
          v-else
          :title="`${$t('pages.auth.registration.account-confirm-email.error.title')}`"
          :text="
            $t(
              'pages.auth.registration.account-confirm-email.error.description',
            )
          "
          :type="`danger`"
          :close-button="false"
        />
        <template #fallback>
          <ClientOnlyFallback
            height="130.8px"
            :text="$t('pages.auth.registration.account-confirm-email.loading')"
            :text-visibility="`visible`"
          />
        </template>
      </ClientOnly>

      <div class="flex justify-center">
        <UButton
          v-if="data"
          color="white"
          size="sm"
          :label="
            $t('pages.auth.registration.account-confirm-email.success.button')
          "
          :to="`/auth/login`"
        />
        <LazyDynamicForm v-else :schema="formSchema" @submit="onSubmit" />
      </div>
    </PageBody>
  </PageWrapper>
</template>
