<script lang="ts" setup>
const emit = defineEmits(['emailVerify'])

const { emailVerify, getEmailVerify } = useAllAuthAuthentication()
const toast = useToast()
const { t, locale } = useI18n()
useHead({ title: () => t('title') })
const localePath = useLocalePath()
const route = useRoute(`account-verify-email-key___${locale.value}`)
const router = useRouter()

const loading = ref(false)

const key = 'key' in route.params ? route.params.key : undefined

const { data: getVerifyEmailData } = await useAsyncData(
  'verifyEmail',
  () => getEmailVerify(String(key)),
)

async function onSubmit(): Promise<void> {
  try {
    loading.value = true
    const data = await emailVerify({ key: String(key) })

    if (data && data.status === 200) {
      toast.add({
        title: t('auth.email.verified'),
        description: t('success.description'),
        color: 'success',
        icon: 'i-lucide-circle-check',
      })

      emit('emailVerify')
      await router.push(localePath('account'))
    }
  }
  catch (error) {
    // django-allauth returns HTTP 401 when the email was verified but the
    // request carried no pending session — the common case of opening the
    // link on a different device/browser. $fetch rejects on 401, so this
    // success path only ever surfaces in catch.
    if (isAllAuthClientError(error) && error.data.data.status === 401) {
      toast.add({
        title: t('auth.email.verified'),
        description: t('success.description'),
        color: 'success',
        icon: 'i-lucide-circle-check',
      })
      emit('emailVerify')
      await router.push(localePath('account'))
      return
    }
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}
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
