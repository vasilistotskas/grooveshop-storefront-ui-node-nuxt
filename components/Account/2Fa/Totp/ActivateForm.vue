<script lang="ts" setup>
import { z } from 'zod'

import type { DynamicFormSchema } from '~/types/form'
import type { TotpPostBody } from '~/types/all-auth'

const emit = defineEmits(['activateTotp'])

const authStore = useAuthStore()
const { getTotpAuthenticatorStatus } = authStore
const {
  totpData,
  totpSecret,
  totpSvg,
} = storeToRefs(authStore)

const { t } = useI18n()
const toast = useToast()

const loading = ref(false)

await getTotpAuthenticatorStatus()

if (totpData.value) {
  await navigateTo('/account/2fa')
}

const { copy, isSupported } = useClipboard({ source: totpSecret.value })

const onSecretClick = () => {
  if (isSupported.value) {
    copy(totpSecret.value)
    toast.add({
      title: t('common.copied'),
      color: 'green',
    })
  }
}

async function onSubmit(values: TotpPostBody) {
  try {
    loading.value = true
    await activateTotp(values)
    toast.add({
      title: t('common.success.title'),
      color: 'green',
    })
    emit('activateTotp')
    await navigateTo('/account/2fa')
  }
  catch (error) {
    if (isAllAuthClientError(error)) {
      const errors = 'errors' in error.data.data ? error.data.data.errors : []
      errors.forEach((error) => {
        toast.add({
          title: error.message,
          color: 'red',
        })
      })
      return
    }
    toast.add({
      title: t('common.error.default'),
      color: 'red',
    })
  }
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t('common.authenticator_code'),
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
    v-if="totpSecret && totpSvg" class="
      grid items-center justify-center justify-items-center gap-4

      md:gap-8
    "
  >
    <div class="grid">
      <label class="grid items-center justify-center justify-items-center gap-2">
        {{ $t('common.authenticator_secret') }}:
        <span
          class="
            rounded-md bg-primary-200

            dark:bg-primary-800
          " v-html="totpSvg"
        />
        <UInput
          :ui="{
            base: 'cursor-pointer text-center !px-0',
          }"
          :value="totpSecret" class="w-full" readonly type="text" @click="onSecretClick"
        />
        <span class="text-center">{{ $t('common.authenticator_secret_description') }}</span>
      </label>
    </div>
    <section class="grid items-center justify-center justify-items-center">
      <DynamicForm
        :button-label="t('common.entry')"
        :schema="formSchema"
        class="grid"
        @submit="onSubmit"
      />
    </section>
  </div>
</template>
