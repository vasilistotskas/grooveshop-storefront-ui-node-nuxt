<script lang="ts" setup>
/**
 * The account's Security page in webside's design: two-step verification
 * at a glance, the passkeys, the password, the email addresses, the
 * signed-in devices and the connected social accounts, each a card that
 * changes itself in place or opens its own page, beside the settings menu.
 *
 * Everything it knows comes from the default design's reading
 * (`useAccountSecurity`) and the composables its sections share, so a
 * rule changed there reaches this page. The routes of the sections
 * (email, devices, connected accounts, two-step, passkeys) show this
 * page too (`variantRegistry`), and each section carries an id a link
 * can jump to. The second factors are read before the page renders; a
 * failed read says so instead of reporting two-step verification off.
 */
const { t, locale } = useStoreI18n('components/variants/webside/Storefront/Account/Security')
useHead({ title: () => t('title') })
const localePath = useLocalePath()
const { supportedFactors, supports, authenticators, activeFactors, hasCurrentPassword, load } = useAccountSecurity()

await load()

const twoStepSummary = computed(() => activeFactors.value.length
  ? t('two_step.on', { factors: new Intl.ListFormat(locale.value, { type: 'conjunction' }).format(activeFactors.value.map(factor => t(`two_step.factors.${factor}`))) })
  : t('two_step.off'))
</script>

<template>
  <WebsideAccountAreaPageWrapper
    class="
      flex flex-col gap-4
      md:gap-8 md:!p-0
    "
  >
    <WebsidePageTitle
      :text="t('title')"
      class="sr-only"
    />

    <div
      class="
        grid gap-4
        lg:flex
      "
    >
      <aside class="md:sticky md:top-16 md:self-start">
        <WebsideAccountAuthSettingsNavigation />
      </aside>

      <!-- `min-w-0`: as a flex item beside the menu this column cannot
           shrink below its widest table otherwise, and the page grew
           past the viewport. -->
      <div class="w-full min-w-0 space-y-6">
        <template v-if="supportedFactors.length">
          <UAlert
            v-if="!authenticators"
            role="alert"
            color="warning"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            :title="t('two_step.load_error')"
            :actions="[{ label: t('retry'), color: 'neutral', variant: 'outline', onClick: () => load() }]"
          />
          <template v-else>
            <WebsideAccountAreaSection
              id="two-step"
              icon="i-heroicons-shield-check"
              :title="t('two_step.title')"
              :description="twoStepSummary"
            >
              <WebsideAccountSecurityTwoStep />
            </WebsideAccountAreaSection>
            <WebsideAccount2FaWebAuthnList
              v-if="supports('webauthn')"
              id="passkeys"
            />
          </template>
        </template>

        <WebsideAccountAreaSection
          id="password"
          icon="i-heroicons-lock-closed"
          :title="t('password.title')"
          :description="hasCurrentPassword ? t('password.set') : t('password.unset')"
        >
          <template #actions>
            <UButton
              :label="hasCurrentPassword ? t('password.change') : t('password.create')"
              :to="localePath('account-password-change')"
              color="neutral"
              variant="outline"
            />
          </template>
        </WebsideAccountAreaSection>

        <WebsideAccountEmailManage id="emails" />
        <WebsideAccountSessionsManage id="devices" />
        <WebsideAccountProvidersManage id="connected-accounts" />
      </div>
    </div>
  </WebsideAccountAreaPageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Ασφάλεια
  retry: Δοκίμασε ξανά
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
  retry: Try again
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
