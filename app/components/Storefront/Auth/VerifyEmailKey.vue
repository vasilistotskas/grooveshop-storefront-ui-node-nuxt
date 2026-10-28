<script lang="ts" setup>
const { t } = useStoreI18n('components/Storefront/Auth/VerifyEmailKey')
useHead({ title: () => t('title') })
const localePath = useLocalePath()

const { data: getVerifyEmailData, loading, verify: onSubmit } = await useVerifyEmailKey({
  successDescription: () => t('success.description'),
  successIcon: 'i-lucide-circle-check',
})
</script>

<template>
  <AuthPanel
    v-if="getVerifyEmailData?.status === 200"
    icon="i-lucide-mail-check"
    :title="t('title')"
    :lead="t('confirm', {
      email: getVerifyEmailData.data.email,
      user: getVerifyEmailData.data.user.display || getVerifyEmailData.data.user.username,
    })"
  >
    <UButton
      :label="t('submit')"
      :loading="loading"
      size="lg"
      block
      @click="onSubmit"
    />
  </AuthPanel>
  <AuthPanel
    v-else
    icon="i-lucide-link-2-off"
    :title="t('invalid.title')"
    :lead="t('invalid.lead')"
  >
    <UButton
      :label="t('go_to_account')"
      :to="localePath('account')"
      size="lg"
      block
    />
    <UButton
      :label="t('back_to_home')"
      :to="localePath('index')"
      color="neutral"
      variant="ghost"
      block
    />
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  title: Επιβεβαίωσε το email σου
  confirm: Επιβεβαίωσε ότι το {email} είναι η διεύθυνση του λογαριασμού {user}.
  submit: Επιβεβαίωση email
  go_to_account: Στον λογαριασμό μου
  back_to_home: Στην αρχική
  success:
    description: Το email σου επιβεβαιώθηκε.
  invalid:
    title: Αυτός ο σύνδεσμος δεν ισχύει πια
    lead: Μπορεί να έληξε ή η διεύθυνση να είναι ήδη επιβεβαιωμένη. Αν χρειάζεσαι νέο σύνδεσμο, ζήτησέ τον από τον λογαριασμό σου.
en:
  title: Confirm your email
  confirm: Confirm that {email} is the address for the account {user}.
  submit: Confirm email
  go_to_account: Go to my account
  back_to_home: Back to home
  success:
    description: Your email is confirmed.
  invalid:
    title: This link no longer works
    lead: It may have expired, or the address is already confirmed. If you need a new link, ask for it from your account.
</i18n>
