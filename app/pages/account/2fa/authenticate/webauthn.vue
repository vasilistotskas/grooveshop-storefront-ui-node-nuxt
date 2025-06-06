<script lang="ts" setup>
import { get, parseRequestOptionsFromJSON } from '@github/webauthn-json/browser-ponyfill'
import type { CredentialRequestOptionsJSON } from '@github/webauthn-json'

const emit = defineEmits(['getWebAuthnRequestOptionsForAuthentication', 'authenticateUsingWebAuthn'])

const toast = useToast()
const authEvent = useState<AuthChangeEventType>('authEvent')
const authStore = useAuthStore()
const { session } = storeToRefs(authStore)
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const items = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('account-login'),
    label: t('breadcrumb.items.account-login.label'),
    icon: t('breadcrumb.items.account-login.icon'),
  },
  {
    to: localePath('account-2fa-authenticate-webauthn'),
    label: t('breadcrumb.items.account-2fa-authenticate-webauthn.label'),
    icon: t('breadcrumb.items.account-2fa-authenticate-webauthn.icon'),
    current: true,
  },
])

if (authEvent.value !== AuthChangeEvent.FLOW_UPDATED) {
  await navigateTo(localePath('index'))
}

const loading = ref(false)

const { getWebAuthnRequestOptionsForAuthentication, authenticateUsingWebAuthn } = useAllAuthAuthentication()

async function onSubmit() {
  try {
    loading.value = true
    const optResp = await getWebAuthnRequestOptionsForAuthentication()
    const jsonOptions = optResp?.data.request_options as CredentialRequestOptionsJSON
    if (!jsonOptions) {
      throw new Error('No creation options')
    }
    const options = parseRequestOptionsFromJSON(jsonOptions)
    const credential = await get(options)
    const response = await authenticateUsingWebAuthn({
      credential,
    })
    session.value = response?.data
    toast.add({
      title: $i18n.t('success.title'),
      color: 'success',
    })
    emit('getWebAuthnRequestOptionsForAuthentication')
    emit('authenticateUsingWebAuthn')
  }
  catch {
    toast.add({
      title: $i18n.t('error.default'),
      color: 'error',
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
      max-w-(--container-2xl) mx-auto flex flex-col gap-4 md:!p-0

      md:gap-8
    "
  >
    <UBreadcrumb
      :items="items"
      :ui="{
        item: 'text-primary-950 dark:text-primary-50',
        root: 'text-xs md:text-md',
      }"
      class="relative mb-5 min-w-0"
    />
    <PageTitle
      :text="t('use.security.key')"
      class="text-center capitalize"
    />
    <Account2FaAuthenticateFlow :authenticator-type="AuthenticatorType.WEBAUTHN">
      <div class="grid items-center justify-center">
        <UButton
          :label="
            $i18n.t('submit')
          "
          color="neutral"
          size="xl"
          :disabled="loading"
          @click="onSubmit"
        />
      </div>
    </Account2FaAuthenticateFlow>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  success:
    title: Συνδέθηκες
  use:
    security:
      key: Χρησιμοποιήστε το κλειδί ασφαλείας
  breadcrumb:
    items:
      account-login:
        label: Σύνδεση
        icon: i-heroicons-arrow-right-on-rectangle
      account-2fa-authenticate-webauthn:
        label: Κλειδί
        icon: i-heroicons-lock-closed
</i18n>
