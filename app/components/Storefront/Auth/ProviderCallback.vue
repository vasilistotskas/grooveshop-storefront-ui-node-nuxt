<script lang="ts" setup>
/**
 * Where the storefront's own OAuth routes land, `?provider=&process=`
 * (or `?provider=&error=` when the provider refused). The provider's
 * tokens sit in the server session, never in the URL: they are read once
 * from `/api/auth/oauth-params` and sent to allauth's provider-token
 * endpoint.
 *
 * Signing in: navigation afterwards belongs to the auth plugin's
 * `auth:change` chain, and this page only shows a failure. A first-time
 * shopper's pending `provider_signup` is the "finish signing up"
 * hand-off, not a failure.
 *
 * Linking an account (Security → Connected accounts): a signed-in
 * shopper only ever arrives here from "Connect", since every sign-in
 * entry point is a guest page. Allauth answers a link with the same
 * session whether it linked the account or refused it as another
 * shopper's, and the auth chain sees no change to act on — so this page
 * reads the shopper's linked accounts back, says which it was, and
 * returns them to the Security page either way.
 */
const { providerToken } = useAllAuthAuthentication()
const { connectedThirdPartyProviderAccounts } = useAllAuthAccount()
const { loggedIn } = useUserSession()
const toast = useToast()

const { t, locale } = useI18n()

const route = useRoute(`account-provider-callback___${locale.value}`)
const localePath = useLocalePath()

const { error: apiError, provider, process } = route.query
const connecting = loggedIn.value

const error = ref(false)
const loading = ref(true)

const title = computed(() => {
  if (error.value) return t('title.error')
  return connecting ? t('title.connecting') : t('title.loading')
})

// The page's document title — see the sibling auth bodies. Its heading
// is conditional (still connecting, or failed), and the tab should say
// the same thing rather than the store name twice.
useHead({ title: () => title.value })

/**
 * Whether the account is linked now. Security offers "Connect" only for
 * a provider with no linked account, so one being there means this link
 * made it.
 */
async function isLinked(providerId: string) {
  const accounts = await connectedThirdPartyProviderAccounts()
  return accounts?.data.some(account => account.provider.id === providerId) ?? false
}

async function returnToSecurity(outcome: 'done' | 'taken' | 'cancelled' | 'failed') {
  toast.add({ title: t(`connect.${outcome}`), color: outcome === 'done' ? 'success' : 'error' })
  await navigateTo(localePath('account-security'), { replace: true })
}

onMounted(async () => {
  if (apiError || !(provider && process)) {
    if (connecting) return returnToSecurity(apiError ? 'cancelled' : 'failed')
    error.value = true
    loading.value = false
    return
  }

  try {
    const oauthParams = await $api('/api/auth/oauth-params')
    const token: ProviderToken = { client_id: String(oauthParams.client_id) }
    if (oauthParams.id_token) {
      Object.assign(token, { id_token: String(oauthParams.id_token) })
    }
    if (oauthParams.access_token) {
      Object.assign(token, { access_token: String(oauthParams.access_token) })
    }
    await providerToken({
      provider: String(oauthParams.provider),
      token,
      process: oauthParams.process === 'login' ? 'login' : 'connect',
    })
    if (connecting) return await returnToSecurity(await isLinked(String(oauthParams.provider)) ? 'done' : 'taken')
  }
  catch (err) {
    if (connecting) {
      log.error({ action: 'provider:connect', error: err })
      return returnToSecurity('failed')
    }
    // A first-time OAuth user gets a 401 with `provider_signup` pending —
    // the expected "complete your signup" hand-off, not a failure. The
    // auth:change hook usually navigates there first; this guard makes the
    // hand-off explicit and keeps the error page for genuine errors only.
    if (await tryAdvanceToPendingFlow(err, { fromPath: route.path })) return
    error.value = true
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <AuthPanel
    :icon="error ? 'i-lucide-circle-alert' : 'i-lucide-hourglass'"
    :title="title"
    :lead="error ? t('description') : undefined"
  >
    <p
      v-if="loading"
      class="sr-only"
      role="status"
    >
      {{ title }}
    </p>
    <UButton
      v-if="error"
      :label="t('continue')"
      :to="localePath(RedirectToURLs.LOGIN_URL)"
      size="lg"
      block
    />
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  title:
    error: Η σύνδεση με τον πάροχο δεν ολοκληρώθηκε
    loading: Σε συνδέουμε…
    connecting: Συνδέουμε τον λογαριασμό σου…
  description: Δοκίμασε ξανά από τη σελίδα σύνδεσης.
  continue: Πίσω στη σύνδεση
  connect:
    done: Ο λογαριασμός συνδέθηκε
    taken: Αυτός ο λογαριασμός είναι ήδη συνδεδεμένος με άλλον πελάτη.
    cancelled: Η σύνδεση του λογαριασμού ακυρώθηκε.
    failed: Ο λογαριασμός δεν συνδέθηκε. Δοκίμασε ξανά.
en:
  title:
    error: Could not sign in with that provider
    loading: Signing you in…
    connecting: Connecting your account…
  description: Try again from the sign-in page.
  continue: Back to sign in
  connect:
    done: Account connected
    taken: That account is already connected to another customer.
    cancelled: Connecting the account was cancelled.
    failed: The account was not connected. Please try again.
</i18n>
