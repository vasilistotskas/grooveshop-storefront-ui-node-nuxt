<script lang="ts" setup>
const emit = defineEmits(['getWebAuthnRequestOptionsForAuthentication', 'authenticateUsingWebAuthn'])

const toast = useToast()
const authEvent = useState<AuthChangeEventType>('authEvent')
const authStore = useAuthStore()
const { session } = storeToRefs(authStore)
const { t } = useI18n()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const items = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('account-login'),
    label: t('breadcrumb.items.account-login.label'),
    icon: t('breadcrumb.items.account-login.icon'),
  },
  {
    to: localePath('account-2fa-authenticate-webauthn'),
    label: t('breadcrumb.items.account-2fa-authenticate-webauthn.label'),
    icon: t('breadcrumb.items.account-2fa-authenticate-webauthn.icon'),
    current: true,
  },
])

if (authEvent.value !== AuthChangeEvent.FLOW_UPDATED) {
  await navigateTo(localePath('index'))
}

const loading = ref(false)
const hasError = ref(false)

const { getWebAuthnRequestOptionsForAuthentication, authenticateUsingWebAuthn } = useAllAuthAuthentication()

async function onSubmit(): Promise<void> {
  try {
    loading.value = true
    hasError.value = false

    const optResp = await getWebAuthnRequestOptionsForAuthentication()
    const jsonOptions = optResp?.data.request_options.publicKey

    if (!jsonOptions) {
      throw new Error('No creation options')
    }

    const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(jsonOptions)
    const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential
    const response = await authenticateUsingWebAuthn({
      credential: credential.toJSON(),
    })

    session.value = response?.data

    toast.add({
      title: $i18n.t('success.title'),
      description: t('success.description'),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })

    emit('getWebAuthnRequestOptionsForAuthentication')
    emit('authenticateUsingWebAuthn')
  }
  catch {
    hasError.value = true
    toast.add({
      title: $i18n.t('error.default'),
      color: 'error',
    })
  }
  finally {
    loading.value = false
  }
}

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-4rem)] items-start justify-center p-4">
    <UContainer class="max-w-2xl">
      <UBreadcrumb
        :items="items"
        :ui="{
          item: 'text-primary-950 dark:text-primary-50',
          root: 'text-xs md:text-base',
        }"
        class="mb-6"
      />

      <UPageCard variant="outline">
        <div class="space-y-6">
          <div class="text-center">
            <div class="mb-4 inline-flex items-center justify-center">
              <UIcon
                name="i-heroicons-finger-print" class="size-12 text-success"
              />
            </div>
            <h1 class="text-2xl font-bold text-highlighted">
              {{ t('use.security.key') }}
            </h1>
            <p class="mt-2 text-sm text-muted">
              {{ t('description') }}
            </p>
          </div>

          <UAlert
            v-if="hasError"
            color="error"
            variant="soft"
            icon="i-heroicons-exclamation-circle"
            :title="$i18n.t('error.title')"
            :description="$i18n.t('error.description')"
            close
            @update:open="hasError = false"
          />

          <UAlert
            color="info"
            variant="soft"
            icon="i-heroicons-information-circle"
          >
            <template #description>
              <ul class="space-y-1 text-xs">
                <li class="flex items-center gap-1.5">
                  <UIcon name="i-heroicons-check-circle" class="size-4 shrink-0" />
                  <span>{{ t('steps.1') }}</span>
                </li>
                <li class="flex items-center gap-1.5">
                  <UIcon name="i-heroicons-check-circle" class="size-4 shrink-0" />
                  <span>{{ t('steps.2') }}</span>
                </li>
                <li class="flex items-center gap-1.5">
                  <UIcon name="i-heroicons-check-circle" class="size-4 shrink-0" />
                  <span>{{ t('steps.3') }}</span>
                </li>
              </ul>
            </template>
          </UAlert>

          <Account2FaAuthenticateFlow :authenticator-type="AuthenticatorType.WEBAUTHN">
            <UButton
              :loading="loading"
              :disabled="loading"
              block
              size="xl"
              color="neutral"
              variant="subtle"
              icon="i-heroicons-finger-print"
              @click="onSubmit"
            >
              {{ $i18n.t('submit') }}
            </UButton>
          </Account2FaAuthenticateFlow>
        </div>
      </UPageCard>
    </UContainer>
  </div>
</template>

<i18n lang="yaml">
el:
  description: Χρησιμοποίησε το κλειδί ασφαλείας ή τη βιομετρική σου ταυτοποίηση
  success:
    title: Συνδέθηκες
    description: Η ταυτοποίηση ολοκληρώθηκε επιτυχώς!
  error:
    title: Σφάλμα ταυτοποίησης
    description: Δεν ήταν δυνατή η επαλήθευση με το κλειδί ασφαλείας. Παρακαλώ δοκίμασε ξανά.
  steps:
    1: Κάνε κλικ στο κουμπί παρακάτω
    2: Ακολούθησε τις οδηγίες στη συσκευή σου
    3: Χρησιμοποίησε το δακτυλικό σου αποτύπωμα ή το κλειδί ασφαλείας
  use:
    security:
      key: Χρησιμοποίησε το κλειδί ασφαλείας
  breadcrumb:
    items:
      account-login:
        label: Σύνδεση
        icon: i-heroicons-arrow-right-on-rectangle
      account-2fa-authenticate-webauthn:
        label: Κλειδί
        icon: i-heroicons-lock-closed
</i18n>
