<script lang="ts" setup>
import {
  parseRequestOptionsFromJSON,
  get,
} from '@github/webauthn-json/browser-ponyfill'
import { AuthChangeEvent, type AuthChangeEventType } from '~/types/all-auth'
import { Flows } from '~/types/all-auth'

const emit = defineEmits(['getWebAuthnRequestOptionsForReauthentication', 'reauthenticateUsingWebAuthn'])

const { getWebAuthnRequestOptionsForReauthentication, reauthenticateUsingWebAuthn } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()
const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()

watchEffect(async () => {
  if (authEvent.value !== AuthChangeEvent.REAUTHENTICATION_REQUIRED) {
    await navigateTo(localePath('/'))
  }
})

const loading = ref(false)

async function onSubmit() {
  try {
    loading.value = true
    const optResp = await getWebAuthnRequestOptionsForReauthentication()
    const jsonOptions = optResp?.data.request_options
    if (!jsonOptions) {
      throw new Error('No creation options')
    }
    const options = parseRequestOptionsFromJSON(jsonOptions)
    const credential = await get(options)
    await reauthenticateUsingWebAuthn({
      credential,
    })
    toast.add({
      title: t('common.success.title'),
      color: 'green',
    })
    emit('getWebAuthnRequestOptionsForReauthentication')
    emit('reauthenticateUsingWebAuthn')
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
      :text="$t('pages.account.2fa.reauthenticate.title')" class="
        text-center capitalize
      "
    />
    <PageBody>
      <Account2FaReauthenticateFlow :flow="Flows.MFA_REAUTHENTICATE">
        <div class="grid items-center justify-center">
          <UButton
            :label="
              $t('common.use.security.key')
            "
            color="primary"
            size="xl"
            :disabled="loading"
            @click="onSubmit"
          />
        </div>
      </Account2FaReauthenticateFlow>
    </pagebody>
  </PageWrapper>
</template>
