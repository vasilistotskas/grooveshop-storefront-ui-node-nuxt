<script lang="ts" setup>
const authEvent = useState<AuthChangeEventType>('authEvent')
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
    to: localePath('account-2fa-authenticate-recovery-codes'),
    label: t('breadcrumb.items.account-2fa-authenticate-recovery-codes.label'),
    icon: t('breadcrumb.items.account-2fa-authenticate-recovery-codes.icon'),
    current: true,
  },
])

if (authEvent.value !== AuthChangeEvent.FLOW_UPDATED) {
  console.info('Redirecting to index', authEvent.value)
  await navigateTo(localePath('index'))
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
          item: `
            text-primary-950
            dark:text-primary-50
          `,
          root: `
            text-xs
            md:text-base
          `,
        }"
        class="mb-6"
      />

      <UPageCard variant="outline">
        <div class="space-y-6">
          <div class="text-center">
            <div class="mb-4 inline-flex items-center justify-center">
              <UIcon name="i-heroicons-key" class="size-12 text-warning" />
            </div>
            <h1 class="text-2xl font-bold text-highlighted">
              {{ $i18n.t('authenticate.recovery_code') }}
            </h1>
            <p class="mt-2 text-sm text-muted">
              {{ t('description') }}
            </p>
          </div>

          <UAlert
            color="warning"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
          >
            <template #title>
              {{ t('warning.title') }}
            </template>
            <template #description>
              {{ t('warning.description') }}
            </template>
          </UAlert>

          <Account2FaAuthenticateCode :authenticator-type="AuthenticatorType.RECOVERY_CODES" />
        </div>
      </UPageCard>
    </UContainer>
  </div>
</template>

<i18n lang="yaml">
el:
  description: Χρησιμοποίησε έναν από τους κωδικούς ανάκτησης που αποθήκευσες
  warning:
    title: Προσοχή
    description: Κάθε κωδικός ανάκτησης μπορεί να χρησιμοποιηθεί μόνο μία φορά. Φρόντισε να αποθηκεύσεις τους υπόλοιπους κωδικούς σε ασφαλές μέρος.
  breadcrumb:
    items:
      account-login:
        label: Σύνδεση
        icon: i-heroicons-arrow-right-on-rectangle
      account-2fa-authenticate-recovery-codes:
        label: Κωδικοί
        icon: i-heroicons-lock-closed
</i18n>
