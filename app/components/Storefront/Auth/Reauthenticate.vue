<script lang="ts" setup>
const emit = defineEmits(['reauthenticate'])

const { reauthenticate } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()

useHead({ title: () => t('title') })

const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()

const loading = ref(false)
const password = ref('')

if (authEvent.value !== undefined && authEvent.value !== AuthChangeEvent.REAUTHENTICATION_REQUIRED) {
  await navigateTo(localePath('index'))
}

async function onSubmit() {
  if (!password.value) return
  try {
    loading.value = true
    await reauthenticate({
      password: password.value,
    })
    toast.add({
      title: t('success'),
      color: 'success',
      icon: 'i-lucide-circle-check',
    })
    emit('reauthenticate')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthPanel
    icon="i-lucide-shield-check"
    :title="t('title')"
    :lead="t('lead')"
  >
    <Account2FaReauthenticateFlow :flow="Flows.REAUTHENTICATE">
      <form
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="t('password')"
          name="password"
          required
        >
          <template #hint>
            <ULink
              :to="localePath('account-password-reset')"
              class="text-[0.8125rem] font-semibold text-accent"
            >
              {{ t('forgot') }}
            </ULink>
          </template>
          <FormPasswordInput
            v-model="password"
            autocomplete="current-password"
            :disabled="loading"
          />
        </UFormField>
        <UButton
          :label="t('submit')"
          :loading="loading"
          :disabled="!password"
          size="lg"
          block
          type="submit"
        />
      </form>
    </Account2FaReauthenticateFlow>
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  title: Επιβεβαίωσε ότι είσαι εσύ
  lead: Πας να αλλάξεις μια ρύθμιση ασφαλείας. Γράψε τον κωδικό σου για να συνεχίσεις.
  password: Κωδικός
  forgot: Ξέχασες τον κωδικό;
  submit: Επιβεβαίωση
  success: Επιβεβαιώθηκε
en:
  title: Confirm it is you
  lead: You are about to change a security setting. Enter your password to continue.
  password: Password
  forgot: Forgot password?
  submit: Confirm
  success: Confirmed
</i18n>
