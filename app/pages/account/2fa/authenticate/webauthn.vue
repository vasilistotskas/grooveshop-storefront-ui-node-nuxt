<script lang="ts" setup>
import { get, parseRequestOptionsFromJSON } from '@github/webauthn-json/browser-ponyfill'
import { AuthChangeEvent, type AuthChangeEventType, AuthenticatorType } from '~/types/all-auth'

const emit = defineEmits(['getWebAuthnRequestOptionsForAuthentication', 'authenticateUsingWebAuthn'])

const toast = useToast()
const { t } = useI18n()
const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()

watchEffect(async () => {
  if (authEvent.value !== AuthChangeEvent.FLOW_UPDATED) {
    await navigateTo(localePath('/'))
  }
})

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
    await authenticateUsingWebAuthn({
      credential,
    })
    toast.add({
      title: t('common.success.title'),
      color: 'green',
    })
    emit('getWebAuthnRequestOptionsForAuthentication')
    emit('authenticateUsingWebAuthn')
  }
  catch {
    toast.add({
      title: t('common.error.default'),
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
      :text="$t('common.use.security.key')"
      class="text-center capitalize"
    />
    <PageBody>
      <Account2FaAuthenticateFlow :authenticator-type="AuthenticatorType.WEBAUTHN">
        <div class="grid items-center justify-center">
          <UButton
            :label="
              $t('common.submit')
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
