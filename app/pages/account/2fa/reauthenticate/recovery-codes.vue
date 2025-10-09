<script lang="ts" setup>
const { twoFaReauthenticate } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()
const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const loading = ref(false)
const recoveryCode = ref('')

if (authEvent.value !== AuthChangeEvent.REAUTHENTICATION_REQUIRED) {
  await navigateTo(localePath('index'))
}

async function onSubmit() {
  if (!recoveryCode.value || recoveryCode.value.length < 8) {
    toast.add({
      title: t('error.invalid_code'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    return
  }

  try {
    loading.value = true
    await twoFaReauthenticate({ code: recoveryCode.value })
    toast.add({
      title: $i18n.t('success.title'),
      description: t('success.description'),
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
  }
  catch (error) {
    handleAllAuthClientError(error)
    recoveryCode.value = ''
  }
  finally {
    loading.value = false
  }
}

definePageMeta({
  layout: 'auth',
})
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center px-4 py-12">
    <UCard
      class="w-full max-w-lg"
      :ui="{
        body: 'space-y-6',
      }"
    >
      <template #header>
        <div class="space-y-2 text-center">
          <div
            class="
              mx-auto flex size-12 items-center justify-center rounded-full
              bg-warning/10
            "
          >
            <UIcon
              name="i-lucide-key-round"
              class="size-6 text-warning"
            />
          </div>
          <h2 class="text-2xl font-bold tracking-tight">
            {{ t('title') }}
          </h2>
          <p class="text-sm text-muted">
            {{ t('description') }}
          </p>
        </div>
      </template>

      <Account2FaReauthenticateFlow :flow="Flows.MFA_REAUTHENTICATE">
        <form
          class="space-y-4"
          @submit.prevent="onSubmit"
        >
          <UFormField
            :label="t('code.label')"
            :help="t('code.help')"
            name="recoveryCode"
            required
          >
            <UInput
              v-model="recoveryCode"
              type="text"
              :placeholder="t('code.placeholder')"
              size="lg"
              icon="i-lucide-key-round"
              autocomplete="off"
              :disabled="loading"
              class="font-mono"
              :ui="{
                root: 'w-full',
                trailing: 'pe-1',
              }"
            />
          </UFormField>

          <UButton
            type="submit"
            color="neutral"
            size="lg"
            block
            :loading="loading"
            :disabled="!recoveryCode"
            icon="i-lucide-arrow-right"
            trailing
          >
            {{ t('submit') }}
          </UButton>
        </form>
      </Account2FaReauthenticateFlow>

      <template #footer>
        <div class="space-y-3">
          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-alert-triangle"
            :title="t('warning.title')"
            :description="t('warning.description')"
          />

          <UAlert
            color="info"
            variant="soft"
            icon="i-lucide-info"
            :description="t('info.description')"
          />
        </div>
      </template>
    </UCard>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Κωδικός Ανάκτησης
  description: Εισάγετε έναν από τους κωδικούς ανάκτησης που σας δόθηκαν
  code:
    label: Κωδικός Ανάκτησης
    placeholder: xxxx-xxxx-xxxx
    help: Κάθε κωδικός μπορεί να χρησιμοποιηθεί μόνο μία φορά
  submit: Επαλήθευση
  success:
    description: Επιτυχής επαλήθευση με κωδικό ανάκτησης
  error:
    invalid_code: Μη έγκυρος κωδικός ανάκτησης
  warning:
    title: Σημαντικό
    description: Αυτός ο κωδικός θα καταναλωθεί μετά τη χρήση και δεν θα μπορεί να χρησιμοποιηθεί ξανά
  info:
    description: Οι κωδικοί ανάκτησης είναι για χρήση έκτακτης ανάγκης όταν δεν έχετε πρόσβαση στην κύρια μέθοδο επαλήθευσης
</i18n>
