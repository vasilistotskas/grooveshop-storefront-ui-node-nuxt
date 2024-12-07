<script lang="ts" setup>
import {
  parseRequestOptionsFromJSON,
  get,
} from '@github/webauthn-json/browser-ponyfill'
import type { CredentialRequestOptionsJSON } from '@github/webauthn-json'

const emit = defineEmits(['getWebAuthnRequestOptionsForReauthentication', 'reauthenticateUsingWebAuthn'])

const { getWebAuthnRequestOptionsForReauthentication, reauthenticateUsingWebAuthn } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n({ useScope: 'local' })
const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()
const authStore = useAuthStore()
const { session } = storeToRefs(authStore)

if (authEvent.value !== AuthChangeEvent.REAUTHENTICATION_REQUIRED) {
  await navigateTo(localePath('index'))
}

const loading = ref(false)

async function onSubmit() {
  try {
    loading.value = true
    const optResp = await getWebAuthnRequestOptionsForReauthentication()
    const jsonOptions = optResp?.data.request_options as CredentialRequestOptionsJSON
    if (!jsonOptions) {
      throw new Error('No creation options')
    }
    const options = parseRequestOptionsFromJSON(jsonOptions)
    const credential = await get(options)
    const response = await reauthenticateUsingWebAuthn({
      credential,
    })
    session.value = response?.data
    toast.add({
      title: t('success.title'),
      color: 'green',
    })
    emit('getWebAuthnRequestOptionsForReauthentication')
    emit('reauthenticateUsingWebAuthn')
  }
  catch {
    toast.add({
      title: t('error.default'),
      color: 'red',
    })
  }
  finally {
    loading.value = false
  }
}

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper
    class="
      container-3xs flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="t('title')" class="text-center capitalize"
    />

    <Account2FaReauthenticateFlow :flow="Flows.MFA_REAUTHENTICATE">
      <div class="grid items-center justify-center">
        <UButton
          :label="
            t('use.security.key')
          "
          color="primary"
          size="xl"
          :disabled="loading"
          @click="onSubmit"
        />
      </div>
    </Account2FaReauthenticateFlow>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επαλήθευση
  use:
    security:
      key: Χρησιμοποιήστε το κλειδί ασφαλείας
</i18n>
