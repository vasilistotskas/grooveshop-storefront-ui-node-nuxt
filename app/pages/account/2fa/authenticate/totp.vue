<script lang="ts" setup>
const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()
const { t } = useI18n()

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
    to: localePath('account-2fa-authenticate-totp'),
    label: t('breadcrumb.items.account-2fa-authenticate-totp.label'),
    icon: t('breadcrumb.items.account-2fa-authenticate-totp.icon'),
    current: true,
  },
])

if (authEvent.value !== AuthChangeEvent.FLOW_UPDATED) {
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
                name="i-heroicons-device-phone-mobile" class="
                  size-12 text-primary
                "
              />
            </div>
            <h1 class="text-2xl font-bold text-highlighted">
              {{ $i18n.t('authenticate.totp') }}
            </h1>
            <p class="mt-2 text-sm text-muted">
              {{ t('description') }}
            </p>
          </div>

          <UAlert
            color="info"
            variant="soft"
            icon="i-heroicons-information-circle"
            :description="t('info_text')"
          />

          <Account2FaAuthenticateCode :authenticator-type="AuthenticatorType.TOTP" />
        </div>
      </UPageCard>
    </UContainer>
  </div>
</template>

<i18n lang="yaml">
el:
  description: Εισάγετε τον κωδικό από την εφαρμογή ελέγχου ταυτότητας
  info_text: Άνοιξε την εφαρμογή authenticator (Google Authenticator, Authy, κλπ.) και εισάγαγε τον 6-ψήφιο κωδικό.
  breadcrumb:
    items:
      account-login:
        label: Σύνδεση
        icon: i-heroicons-arrow-right-on-rectangle
      account-2fa-authenticate-totp:
        label: TOTP
        icon: i-heroicons-lock-closed
</i18n>
