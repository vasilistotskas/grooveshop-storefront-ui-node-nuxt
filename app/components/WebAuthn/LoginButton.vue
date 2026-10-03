<script lang="ts" setup>
const emit = defineEmits(['getWebAuthnRequestOptionsForLogin', 'loginUsingWebAuthn'])

const { getWebAuthnRequestOptionsForLogin, loginUsingWebAuthn } = useAllAuthAuthentication()
const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const { clear } = useUserSession()
const authStore = useAuthStore()
const { session } = storeToRefs(authStore)
const cartStore = useCartStore()
const { refreshCart } = cartStore

const loading = ref(false)

async function onSubmit() {
  try {
    loading.value = true
    const currentPath = router.currentRoute.value.path
    const currentQuery = router.currentRoute.value.query

    if (!currentQuery.next) {
      await router.replace({ query: { next: currentPath } })
    }

    await clear()

    const optResp = await getWebAuthnRequestOptionsForLogin()
    const jsonOptions = optResp?.data.request_options.publicKey
    if (!jsonOptions) {
      throw new Error('No creation options')
    }

    const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(jsonOptions)
    const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential
    const response = await loginUsingWebAuthn({
      credential: credential.toJSON(),
    })
    session.value = response?.data
    await performPostLoginActions()
  }
  catch {
    log.error({ action: 'webauthn:login' })
    toast.add({
      title: t('webauthn.error.title'),
      description: t('webauthn.error.description'),
      color: 'error',
    })
  }
  finally {
    await finalizeLogin()
  }
}

async function performPostLoginActions() {
  await refreshCart()
}

async function finalizeLogin() {
  loading.value = false
  emit('getWebAuthnRequestOptionsForLogin')
  emit('loginUsingWebAuthn')
}
</script>

<template>
  <!-- A passkey or a security key: the browser offers whichever the
       shopper has. `type="button"`: it sits beside the sign-in form,
       and must never submit it. -->
  <UButton
    icon="i-lucide-key-round"
    :label="t('webauthn.login')"
    :loading="loading"
    color="neutral"
    variant="outline"
    size="lg"
    block
    type="button"
    @click="onSubmit"
  />
</template>

<i18n lang="yaml">
el:
  webauthn:
    login: Σύνδεση με passkey
    error:
      title: Η σύνδεση απέτυχε
      description: Η συσκευή σου δεν επιβεβαίωσε τη σύνδεση. Δοκίμασε ξανά.
en:
  webauthn:
    login: Sign in with a passkey
    error:
      title: Sign-in failed
      description: Your device did not confirm the sign-in. Try again.
</i18n>
