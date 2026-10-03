<script lang="ts" setup>
/**
 * The account's Security page, as the boards draw it: two-step
 * verification at a glance, the passkeys, the password, the email
 * addresses, the signed-in devices and the connected social accounts —
 * each a section that changes itself in place or opens its own page.
 *
 * Only the redesign has it (`REDESIGN_ONLY_PAGES`): the frozen
 * webside tree keeps those pages apart, behind its own settings menu.
 * Here their routes (email, devices, connected accounts, two-step,
 * passkeys) show this page too (`variantRegistry`), and each section
 * carries an id a link can jump to.
 *
 * The second factors are read on the server too, so the page renders
 * them rather than "Off" until the app's idle refresh lands; a failed
 * read says so instead of reporting two-step verification off.
 */
const { t, locale } = useI18n()
useHead({ title: () => t('title') })
const localePath = useLocalePath()
const authStore = useAuthStore()
const { config, authenticators, totpAuthenticator, hasCurrentPassword } = storeToRefs(authStore)

await authStore.setupAuthenticators()

const supportedFactors = computed(() => config.value?.mfa?.supported_types ?? [])

const activeFactors = computed(() => {
  const active: string[] = []
  if (totpAuthenticator.value) active.push(t('two_step.factors.totp'))
  if (authenticators.value?.some(authenticator => authenticator.type === AuthenticatorType.WEBAUTHN)) {
    active.push(t('two_step.factors.webauthn'))
  }
  return active
})

const twoStepSummary = computed(() => activeFactors.value.length
  ? t('two_step.on', { factors: new Intl.ListFormat(locale.value, { type: 'conjunction' }).format(activeFactors.value) })
  : t('two_step.off'))
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader
      :title="t('title')"
      :lead="t('lead')"
    />

    <template v-if="supportedFactors.length">
      <AccountLoadError
        v-if="!authenticators"
        :message="t('two_step.load_error')"
        @retry="() => authStore.setupAuthenticators()"
      />
      <template v-else>
        <AccountSection
          id="two-step"
          :title="t('two_step.title')"
          :description="twoStepSummary"
        >
          <AccountSecurityTwoStep />
        </AccountSection>
        <Account2FaWebAuthnList
          v-if="supportedFactors.includes('webauthn')"
          id="passkeys"
        />
      </template>
    </template>

    <AccountSection
      id="password"
      :title="t('password.title')"
      :description="hasCurrentPassword ? t('password.set') : t('password.unset')"
    >
      <template #actions>
        <UButton
          :label="hasCurrentPassword ? t('password.change') : t('password.create')"
          :to="localePath('account-password-change')"
          color="neutral"
          variant="outline"
          size="sm"
        />
      </template>
    </AccountSection>

    <AccountEmailManage id="emails" />
    <AccountSessionsManage id="devices" />
    <AccountProvidersManage id="connected-accounts" />
  </div>
</template>

<i18n lang="yaml">
el:
  title: Ασφάλεια
  lead: Μέθοδοι σύνδεσης, επαλήθευση δύο βημάτων και πού είσαι συνδεδεμένος.
  two_step:
    title: Επαλήθευση δύο βημάτων
    "on": Ενεργή · {factors}
    "off": Ανενεργή. Πρόσθεσε ένα δεύτερο βήμα για να προστατεύσεις τον λογαριασμό σου.
    factors:
      totp: εφαρμογή επαλήθευσης
      webauthn: passkeys
    load_error: Δεν μπορέσαμε να φορτώσουμε την επαλήθευση δύο βημάτων.
  password:
    title: Κωδικός πρόσβασης
    set: Ο κωδικός με τον οποίο συνδέεσαι με το email σου.
    unset: Συνδέεσαι χωρίς κωδικό. Όρισε έναν για να συνδέεσαι και με το email σου.
    change: Αλλαγή κωδικού
    create: Ορισμός κωδικού
en:
  title: Security
  lead: Sign-in methods, two-step verification and where you are signed in.
  two_step:
    title: Two-step verification
    "on": On · {factors}
    "off": Off. Add a second step to protect your account.
    factors:
      totp: authenticator app
      webauthn: passkeys
    load_error: We could not load two-step verification.
  password:
    title: Password
    set: The password you sign in with alongside your email.
    unset: You sign in without a password. Set one to sign in with your email too.
    change: Change password
    create: Set a password
</i18n>
