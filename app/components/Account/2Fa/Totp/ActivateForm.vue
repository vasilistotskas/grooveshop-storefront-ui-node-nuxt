<script lang="ts" setup>
import * as z from 'zod'

const emit = defineEmits(['activateTotp'])

const nuxtApp = useNuxtApp()
const { activateTotp, totpAuthenticatorStatus } = useAllAuthAccount()

const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

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
    await navigateTo(localePath('account-settings'))
  }
})

const { copy, isSupported } = useClipboard({ source: totpSecret.value })

const onSecretClick = () => {
  if (isSupported.value) {
    copy(totpSecret.value)
    toast.add({
      title: t('copied'),
      color: 'success',
    })
  }
}

async function onSubmit(values: TotpPostBody) {
  try {
    loading.value = true
    await activateTotp(values)
    toast.add({
      title: $i18n.t('success.title'),
      color: 'success',
    })
    emit('activateTotp')
    await navigateTo(localePath('account-settings'))
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
}

const formSchema = computed<DynamicFormSchema>(() => ({
  fields: [
    {
      label: t('authenticator_code'),
      name: 'code',
      as: 'input',
      rules: z.string({ error: issue => issue.input === undefined
        ? $i18n.t('validation.required')
        : $i18n.t('validation.string.invalid') }).min(6).max(6),
      autocomplete: 'one-time-code',
      condition: null,
      disabledCondition: null,
      readonly: false,
      required: true,
      placeholder: '123456',
      type: 'text',
    },
  ],
}))
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
      v-if="totpSecret && totpSvg"
      class="
        grid items-center justify-center justify-items-center gap-4
        md:gap-8
      "
    >
      <div class="grid">
        <label
          class="grid items-center justify-center justify-items-center gap-2"
        >
          {{ t('authenticator_secret') }}:
          <span
            class="
              rounded-md bg-primary-200
              dark:bg-primary-800
            "
            v-html="totpSvg"
          />
          <UInput
            v-model="totpSecret"
            :ui="{
              root: 'w-full',
              base: 'cursor-pointer text-center !px-0',
            }"
            readonly
            type="text"
            @click="onSecretClick"
          />
          <span class="text-center">{{ t('authenticator_secret_description') }}</span>
        </label>
      </div>
      <section class="grid items-center justify-center justify-items-center">
        <DynamicForm
          :button-label="$i18n.t('entry')"
          :schema="formSchema"
          class="grid"
          @submit="onSubmit"
        />
      </section>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  authenticator_secret: Μυστικό πολλαπλών παραγόντων
  authenticator_secret_description: Μπορείς να αποθηκεύσεις αυτό το μυστικό και να το χρησιμοποιήσεις για να επανεγκαταστήσεις την εφαρμογή πολλαπλών παραγόντων σε μεταγενέστερο χρόνο.
</i18n>
