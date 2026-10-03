<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()
const authInfo = useAuthInfo()

useHead({ title: () => t('title') })

/** The provider the shopper came through, when the pending flow names it. */
const providerName = computed(() => authInfo?.pendingFlow?.provider?.name)
</script>

<template>
  <AuthPanel
    :title="t('title')"
    :lead="providerName ? t('lead_provider', { provider: providerName }) : t('lead')"
  >
    <AccountProviderSignup />
    <p class="text-center text-sm text-muted">
      {{ t('have_account') }}
      <ULink
        :to="localePath('account-login')"
        class="font-semibold text-accent"
      >
        {{ t('login') }}
      </ULink>
    </p>
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  title: Σχεδόν έτοιμοι
  lead: Έλεγξε τα στοιχεία σου για να ολοκληρώσεις.
  lead_provider: Συνδέθηκες με {provider}. Έλεγξε τα στοιχεία σου για να ολοκληρώσεις.
  have_account: Έχεις ήδη λογαριασμό;
  login: Σύνδεση
en:
  title: Almost there
  lead: Check your details to finish.
  lead_provider: You signed in with {provider}. Check your details to finish.
  have_account: Already have an account?
  login: Sign in
</i18n>
