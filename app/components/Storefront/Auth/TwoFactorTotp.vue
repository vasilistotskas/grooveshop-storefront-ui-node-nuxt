<script lang="ts" setup>
const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()
const { t } = useI18n()
const tenantStore = useTenantStore()

useHead({ title: () => t('title') })

// Only redirect if authEvent is defined and is the wrong event. On hard
// refresh authEvent.value is undefined (useState has no SSR value); without
// the defined-check, every direct visit would bounce to home.
if (authEvent.value !== undefined && authEvent.value !== AuthChangeEvent.FLOW_UPDATED) {
  await navigateTo(localePath('index'))
}
</script>

<template>
  <AuthPanel
    icon="i-lucide-shield-check"
    :title="t('title')"
    :lead="t('lead', { store: tenantStore.storeName })"
  >
    <Account2FaAuthenticateCode :authenticator-type="AuthenticatorType.TOTP" />
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  title: Επαλήθευση σε δύο βήματα
  lead: Άνοιξε την εφαρμογή επαλήθευσης και γράψε τον 6ψήφιο κωδικό για το {store}.
en:
  title: Two-step verification
  lead: Open your authenticator app and enter the 6-digit code for {store}.
</i18n>
