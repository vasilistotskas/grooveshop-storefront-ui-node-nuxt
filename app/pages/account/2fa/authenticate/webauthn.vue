<script lang="ts" setup>
import { get, parseRequestOptionsFromJSON } from '@github/webauthn-json/browser-ponyfill'
import { AuthChangeEvent, type AuthChangeEventType, AuthenticatorType } from '~/types/all-auth'

const emit = defineEmits(['getWebAuthnRequestOptionsForAuthentication', 'authenticateUsingWebAuthn'])

const toast = useToast()
const { t } = useI18n({ useScope: 'local' })
const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()
const authStore = useAuthStore()
const { session } = storeToRefs(authStore)

if (authEvent.value !== AuthChangeEvent.FLOW_UPDATED) {
  await navigateTo(localePath('/'))
}

const loading = ref(false)

const { getWebAuthnRequestOptionsForAuthentication, authenticateUsingWebAuthn } = useAllAuthAuthentication()

async function onSubmit() {
  try {
    loading.value = true
    const optResp = await getWebAuthnRequestOptionsForAuthentication()
    const jsonOptions = optResp?.data.request_options
    if (!jsonOptions) {
      throw new Error('No creation options')
    }
    const options = parseRequestOptionsFromJSON(jsonOptions)
    const credential = await get(options)
    session.value = await authenticateUsingWebAuthn({
      credential,
    })
    toast.add({
      title: t('success.title'),
      color: 'green',
    })
    emit('getWebAuthnRequestOptionsForAuthentication')
    emit('authenticateUsingWebAuthn')
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
      :text="t('use.security.key')"
      class="text-center capitalize"
    />
    <PageBody>
      <Account2FaAuthenticateFlow :authenticator-type="AuthenticatorType.WEBAUTHN">
        <div class="grid items-center justify-center">
          <UButton
            :label="
              $t('submit')
            "
            color="primary"
            size="xl"
            :disabled="loading"
            @click="onSubmit"
          />
        </div>
      </Account2FaAuthenticateFlow>
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  use:
    security:
      key: Χρησιμοποιήστε το κλειδί ασφαλείας
</i18n>
