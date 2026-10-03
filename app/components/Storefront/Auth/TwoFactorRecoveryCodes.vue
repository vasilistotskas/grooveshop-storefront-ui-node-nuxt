<script lang="ts" setup>
const authEvent = useState<AuthChangeEventType>('authEvent')
const { t } = useI18n()
const localePath = useLocalePath()

useHead({ title: () => t('title') })

if (authEvent.value !== undefined && authEvent.value !== AuthChangeEvent.FLOW_UPDATED) {
  log.info({ tag: 'auth', message: 'Redirecting to index', event: authEvent.value })
  await navigateTo(localePath('index'))
}
</script>

<template>
  <AuthPanel
    :title="t('title')"
    :lead="t('lead')"
  >
    <Account2FaAuthenticateCode :authenticator-type="AuthenticatorType.RECOVERY_CODES" />
    <UAlert
      color="warning"
      variant="soft"
      icon="i-lucide-life-buoy"
      :title="t('low.title')"
      :description="t('low.description')"
    />
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  title: Κωδικός ανάκτησης
  lead: Κάθε κωδικός ανάκτησης δουλεύει μία φορά. Θα τους βρεις εκεί που τους φύλαξες όταν ενεργοποίησες την επαλήθευση σε δύο βήματα.
  low:
    title: Σου τελειώνουν;
    description: Μόλις συνδεθείς, φτιάξε καινούργιους από τις ρυθμίσεις ασφαλείας του λογαριασμού σου.
en:
  title: Use a recovery code
  lead: Each of your recovery codes works once. Find them where you saved them when you turned on two-step verification.
  low:
    title: Running low?
    description: After signing in, generate a new set in your account's security settings.
</i18n>
