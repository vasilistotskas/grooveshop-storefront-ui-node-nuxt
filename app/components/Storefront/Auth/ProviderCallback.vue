<script lang="ts" setup>
const {
  providerToken,
} = useAllAuthAuthentication()

const { t, locale } = useI18n()

const route = useRoute(`account-provider-callback___${locale.value}`)
const localePath = useLocalePath()

const {
  error: apiError,
  provider,
  process,
  messages,
} = route.query
// NOTE: access_token, id_token, client_id are fetched from session API, not URL.
// authInfo intentionally NOT imported: navigation is fully driven by the
// auth plugin's auth:change → handleLoggedIn chain. A guard here would be
// dead-code at best and a duplicate navigateTo race at worst.

const url = ref<typeof RedirectToURLs[keyof typeof RedirectToURLs]>(RedirectToURLs.LOGIN_URL)
const error = ref(false)
const loading = ref(true)

const title = computed(() => {
  if (loading.value) return t('title.loading')
  if (error.value) return t('title.error')
  if (messages) return messages
  return ''
})

// The page's document title — see the sibling auth bodies. Its heading
// is conditional (still connecting, or failed), and the tab should say
// the same thing rather than the store name twice.
useHead({ title: () => String(title.value) })

onMounted(async () => {
  if (apiError) {
    error.value = true
  }

  if (provider && process) {
    try {
      loading.value = true
      // Fetch tokens securely from server session (not URL)
      const oauthParams = await $api('/api/auth/oauth-params')
      const token: ProviderToken = {
        client_id: String(oauthParams.client_id),
      }
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
    }
    catch (err) {
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
  }
  else {
    loading.value = false
  }

  if (!(provider && process)) {
    error.value = true
  }
})
</script>

<template>
  <AuthPanel
    :icon="error ? 'i-lucide-circle-alert' : 'i-lucide-hourglass'"
    :title="String(title) || t('title.loading')"
    :lead="error ? t('description') : undefined"
  >
    <p
      v-if="loading"
      class="sr-only"
      role="status"
    >
      {{ t('title.loading') }}
    </p>
    <UButton
      v-if="error"
      :label="t('continue')"
      :to="localePath(url)"
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
  description: Δοκίμασε ξανά από τη σελίδα σύνδεσης.
  continue: Πίσω στη σύνδεση
en:
  title:
    error: Could not sign in with that provider
    loading: Signing you in…
  description: Try again from the sign-in page.
  continue: Back to sign in
</i18n>
