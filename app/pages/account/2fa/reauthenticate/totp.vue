<script lang="ts" setup>
const { twoFaReauthenticate } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()
const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const loading = ref(false)
const code = ref<number[]>([])

if (authEvent.value !== AuthChangeEvent.REAUTHENTICATION_REQUIRED) {
  await navigateTo(localePath('index'))
}

async function onSubmit() {
  const codeValue = code.value.join('')

  if (codeValue.length !== 6) {
    toast.add({
      title: t('error.invalid_code'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
    return
  }

  try {
    loading.value = true
    await twoFaReauthenticate({ code: codeValue })
    toast.add({
      title: $i18n.t('success.title'),
      description: t('success.description'),
      color: 'success',
      icon: 'i-lucide-check-circle',
    })
  }
  catch (error) {
    handleAllAuthClientError(error)
    code.value = []
  }
  finally {
    loading.value = false
  }
}

function handleComplete(value: number[]) {
  code.value = value
  onSubmit()
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
              bg-primary/10
            "
          >
            <UIcon
              name="i-lucide-smartphone"
              class="size-6 text-primary"
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
          class="space-y-6"
          @submit.prevent="onSubmit"
        >
          <div class="flex flex-col items-center space-y-4">
            <UFormField
              name="code"
              class="w-full text-center"
            >
              <div class="flex justify-center">
                <UPinInput
                  v-model="code"
                  :length="6"
                  type="number"
                  size="lg"
                  otp
                  :disabled="loading"
                  @complete="handleComplete"
                />
              </div>
            </UFormField>

            <p class="text-xs text-muted">
              {{ t('code.hint') }}
            </p>
          </div>

          <UButton
            type="submit"
            color="neutral"
            size="lg"
            block
            :loading="loading"
            :disabled="code.join('').length !== 6"
            icon="i-lucide-arrow-right"
            trailing
          >
            {{ t('submit') }}
          </UButton>
        </form>
      </Account2FaReauthenticateFlow>

      <template #footer>
        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-alert-triangle"
          :title="t('warning.title')"
          :description="t('warning.description')"
        />
      </template>
    </UCard>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Επαλήθευση 2FA
  description: Εισάγετε τον 6ψήφιο κωδικό από την εφαρμογή επαλήθευσης
  code:
    label: Κωδικός Επαλήθευσης
    hint: Ανοίξτε την εφαρμογή επαλήθευσης και εισάγετε τον κωδικό
  submit: Επαλήθευση
  success:
    description: Επιτυχής επαλήθευση
  error:
    invalid_code: Μη έγκυρος κωδικός επαλήθευσης
  warning:
    title: Δεν έχετε πρόσβαση στην εφαρμογή;
    description: Μπορείτε να χρησιμοποιήσετε έναν κωδικό ανάκτησης ή άλλη μέθοδο επαλήθευσης
</i18n>
