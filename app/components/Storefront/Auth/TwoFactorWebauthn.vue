<script lang="ts" setup>
const emit = defineEmits(['getWebAuthnRequestOptionsForAuthentication', 'authenticateUsingWebAuthn'])

const toast = useToast()
const authEvent = useState<AuthChangeEventType>('authEvent')
const authStore = useAuthStore()
const { session } = storeToRefs(authStore)
const { t } = useI18n()
const localePath = useLocalePath()

useHead({ title: () => t('title') })

if (authEvent.value !== undefined && authEvent.value !== AuthChangeEvent.FLOW_UPDATED) {
  await navigateTo(localePath('index'))
}

const loading = ref(false)
const hasError = ref(false)

const { getWebAuthnRequestOptionsForAuthentication, authenticateUsingWebAuthn } = useAllAuthAuthentication()

/**
 * Asks the browser for the key. Started by the shopper's click, not on
 * load: Safari refuses a WebAuthn request without a user gesture.
 */
async function onSubmit(): Promise<void> {
  try {
    loading.value = true
    hasError.value = false

    const optResp = await getWebAuthnRequestOptionsForAuthentication()
    const jsonOptions = optResp?.data.request_options.publicKey

    if (!jsonOptions) {
      throw new Error('No creation options')
    }

    const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(jsonOptions)
    const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential
    const response = await authenticateUsingWebAuthn({
      credential: credential.toJSON(),
    })

    session.value = response?.data

    toast.add({
      title: t('success.title'),
      description: t('success.description'),
      color: 'success',
      icon: 'i-lucide-circle-check',
    })

    emit('getWebAuthnRequestOptionsForAuthentication')
    emit('authenticateUsingWebAuthn')
  }
  catch {
    hasError.value = true
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthPanel
    icon="i-lucide-key-round"
    :title="t('title')"
    :lead="t('lead')"
  >
    <Account2FaAuthenticateFlow :authenticator-type="AuthenticatorType.WEBAUTHN">
      <div
        v-if="loading"
        class="flex items-center gap-3 rounded-[1.125rem] border border-default bg-default p-4"
        role="status"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-5 animate-spin text-muted"
        />
        <strong class="text-sm text-highlighted">{{ t('waiting') }}</strong>
      </div>
      <UAlert
        v-else-if="hasError"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        :title="t('error.title')"
        :description="t('error.description')"
      />
      <UButton
        :label="hasError ? t('retry') : t('start')"
        :loading="loading"
        size="lg"
        block
        @click="onSubmit"
      />
    </Account2FaAuthenticateFlow>
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  title: Χρησιμοποίησε το κλειδί ασφαλείας σου
  lead: Βάλε το κλειδί σου ή επιβεβαίωσε στη συσκευή σου όταν σου το ζητήσει ο browser.
  start: Χρήση κλειδιού ασφαλείας
  retry: Δοκίμασε ξανά
  waiting: Περιμένουμε τη συσκευή σου…
  success:
    title: Συνδέθηκες
    description: Η επαλήθευση ολοκληρώθηκε.
  error:
    title: Η επαλήθευση δεν ολοκληρώθηκε
    description: Η συσκευή σου δεν επιβεβαίωσε. Δοκίμασε ξανά ή διάλεξε άλλο τρόπο.
en:
  title: Use your security key
  lead: Insert your key or confirm on your device when your browser asks.
  start: Use security key
  retry: Try again
  waiting: Waiting for your device…
  success:
    title: You are signed in
    description: Verification complete.
  error:
    title: Verification did not finish
    description: Your device did not confirm. Try again or pick another way.
</i18n>
