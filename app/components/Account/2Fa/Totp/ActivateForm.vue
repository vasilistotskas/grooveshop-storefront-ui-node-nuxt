<script lang="ts" setup>
import { z } from 'zod'

import type { DynamicFormSchema } from '~/types/form'
import type { TotpPostBody } from '~/types/all-auth'

const emit = defineEmits(['activateTotp'])

const nuxtApp = useNuxtApp()
const { activateTotp, totpAuthenticatorStatus } = useAllAuthAccount()

const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()

const loading = ref(false)

const { data, error } = await useAsyncData(
  'totpAuthenticatorStatus',
  () => totpAuthenticatorStatus(),
  {
    getCachedData(key) {
      return nuxtApp.payload.data[key] || nuxtApp.static.data[key]
    },
  },
)

const totpSecret = computed(() => {
  if (!data.value) {
    return ''
  }
  if (!('meta' in data.value)) {
    return ''
  }
  return data.value?.meta.secret
})

const totpSvg = computed(() => {
  if (!data.value) {
    return ''
  }
  if (!('meta' in data.value)) {
    return ''
  }
  return data.value?.meta.totp_svg
})

watchEffect(async () => {
  if (error.value) {
    await navigateTo(localePath('/account/settings'))
  }
})

const { copy, isSupported } = useClipboard({ source: totpSecret.value })

const onSecretClick = () => {
  if (isSupported.value) {
    copy(totpSecret.value)
    toast.add({
      title: t('copied'),
      color: 'green',
    })
  }
}

async function onSubmit(values: TotpPostBody) {
  try {
    loading.value = true
    await activateTotp(values)
    toast.add({
      title: t('success.title'),
      color: 'green',
    })
    emit('activateTotp')
    await navigateTo(localePath('/account/settings'))
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      label: t('authenticator_code'),
      name: 'code',
      as: 'input',
      rules: z.string({ required_error: t('validation.required') }).min(6).max(6),
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
      grid gap-4

      lg:flex
    "
  >
    <slot />
    <div
      v-if="totpSecret && totpSvg" class="
        grid items-center justify-center justify-items-center gap-4

        md:gap-8
      "
    >
      <div class="grid">
        <label
          class="grid items-center justify-center justify-items-center gap-2"
        >
          {{ $t('authenticator_secret') }}:
          <span
            class="
              rounded-md bg-primary-200

              dark:bg-primary-800
            " v-html="totpSvg"
          />
          <UInput
            v-model="totpSecret"
            :ui="{
              base: 'cursor-pointer text-center !px-0',
            }" class="w-full" readonly type="text" @click="onSecretClick"
          />
          <span class="text-center">{{ $t('authenticator_secret_description') }}</span>
        </label>
      </div>
      <section class="grid items-center justify-center justify-items-center">
        <DynamicForm
          :button-label="t('entry')"
          :schema="formSchema"
          class="grid"
          @submit="onSubmit"
        />
      </section>
    </div>
  </div>
</template>
