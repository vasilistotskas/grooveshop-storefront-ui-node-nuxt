<script lang="ts" setup>
const authEvent = useState<AuthChangeEventType>('authEvent')
const { t } = useI18n({ useScope: 'local' })
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
  <PageWrapper
    class="
      max-w-(--container-2xl) mx-auto flex flex-col gap-4 md:!p-0

      md:gap-8
    "
  >
    <UBreadcrumb
      :items="items"
      :ui="{
        item: 'text-primary-950 dark:text-primary-50',
        root: 'text-xs md:text-md',
      }"
      class="relative mb-5 min-w-0"
    />
    <PageTitle
      :text="$i18n.t('authenticate.recovery_code')"
      class="text-center capitalize"
    />
    <Account2FaAuthenticateCode :authenticator-type="AuthenticatorType.RECOVERY_CODES" />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  breadcrumb:
    items:
      account-login:
        label: Σύνδεση
        icon: i-heroicons-arrow-right-on-rectangle
      account-2fa-authenticate-recovery-codes:
        label: Κωδικοί
        icon: i-heroicons-lock-closed
</i18n>
