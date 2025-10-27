<script lang="ts" setup>
const emit = defineEmits(['getWebAuthnRequestOptionsForReauthentication', 'reauthenticateUsingWebAuthn'])

const { $i18n } = useNuxtApp()
const { getWebAuthnRequestOptionsForReauthentication, reauthenticateUsingWebAuthn } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()
const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()
const authStore = useAuthStore()
const { session } = storeToRefs(authStore)

if (authEvent.value !== AuthChangeEvent.REAUTHENTICATION_REQUIRED) {
  await navigateTo(localePath('index'))
}

const loading = ref(false)
const error = ref<string | null>(null)

async function onSubmit() {
  error.value = null

  try {
    loading.value = true
    const optResp = await getWebAuthnRequestOptionsForReauthentication()
    const jsonOptions = optResp?.data.request_options.publicKey

    if (!jsonOptions) {
      throw new Error('No creation options')
    }

    const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(jsonOptions)
    const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential
    const response = await reauthenticateUsingWebAuthn({
      credential: credential.toJSON(),
    })

    session.value = response?.data
    toast.add({
      title: $i18n.t('success.title'),
      description: t('success.description'),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
    emit('getWebAuthnRequestOptionsForReauthentication')
    emit('reauthenticateUsingWebAuthn')
  }
  catch {
    error.value = t('error.failed')
    toast.add({
      title: $i18n.t('error.default'),
      description: t('error.description'),
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
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
              bg-secondary/10
            "
          >
            <UIcon
              name="i-heroicons-finger-print"
              class="size-6 text-secondary"
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
        <div class="space-y-6">
          <div class="flex flex-col items-center space-y-4">
            <div
              class="
                cursor-pointer rounded-lg border border-dashed border-default
                p-4
              " @click="onSubmit"
            >
              <UIcon
                name="i-heroicons-cpu-chip"
                class="size-8 text-info"
              />
            </div>

            <div class="space-y-2 text-center">
              <p class="text-sm font-medium">
                {{ t('instructions.title') }}
              </p>
              <ul class="space-y-1 text-xs text-muted">
                <li>{{ t('instructions.step1') }}</li>
                <li>{{ t('instructions.step2') }}</li>
                <li>{{ t('instructions.step3') }}</li>
              </ul>
            </div>
          </div>

          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            icon="i-heroicons-exclamation-circle"
            :description="error"
          />

          <UButton
            size="lg"
            color="neutral"
            block
            :loading="loading"
            icon="i-heroicons-finger-print"
            @click="onSubmit"
          >
            {{ t('button.label') }}
          </UButton>
        </div>
      </Account2FaReauthenticateFlow>

      <template #footer>
        <UAlert
          color="info"
          variant="soft"
          icon="i-heroicons-information-circle"
          :title="t('info.title')"
          :description="t('info.description')"
        />
      </template>
    </UCard>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Επαλήθευση με Κλειδί Ασφαλείας
  description: Χρησιμοποιήστε το κλειδί ασφαλείας σας για επαλήθευση
  instructions:
    title: Ακολουθήστε αυτά τα βήματα
    step1: 1. Συνδέστε το κλειδί ασφαλείας σας
    step2: 2. Πατήστε το κουμπί παρακάτω
    step3: 3. Ακολουθήστε τις οδηγίες στο κλειδί σας
  button:
    label: Χρήση Κλειδιού Ασφαλείας
  success:
    description: Επιτυχής επαλήθευση με κλειδί ασφαλείας
  error:
    failed: Η επαλήθευση απέτυχε
    description: Παρακαλούμε δοκιμάστε ξανά ή χρησιμοποιήστε άλλη μέθοδο
  info:
    title: Τι είναι το κλειδί ασφαλείας;
    description: Ένα κλειδί ασφαλείας είναι μια φυσική συσκευή που παρέχει ισχυρή επαλήθευση δύο παραγόντων
</i18n>
