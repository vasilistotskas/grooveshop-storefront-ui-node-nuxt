<script lang="ts" setup>
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
    to: localePath('account-login-code'),
    label: t('breadcrumb.items.account-login-code.label'),
    icon: t('breadcrumb.items.account-login-code.icon'),
  },
  {
    to: localePath('account-login-code-confirm'),
    label: t('breadcrumb.items.account-login-code-confirm.label'),
    icon: t('breadcrumb.items.account-login-code-confirm.icon'),
    current: true,
  },
])

definePageMeta({
  layout: 'default',
  middleware: 'guest',
})
</script>

<template>
  <PageWrapper
    class="
      mx-auto flex max-w-(--container-2xl) flex-col gap-4
      md:gap-8 md:!p-0
    "
  >
    <UBreadcrumb
      :items="items"
      :ui="{
        item: 'text-primary-950 dark:text-primary-50',
        root: 'text-xs md:text-base',
      }"
      class="relative mb-5 min-w-0"
    />
    <PageTitle
      :text="t('title')"
      class="text-center"
    />
    <p
      class="
        text-center text-primary-950
        dark:text-primary-50
      "
    >
      {{ t('description') }}
    </p>

    <AccountLoginCodeConfirmForm />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επιβεβαίωση κωδικού
  description: Ο κωδικός λήγει σύντομα, οπότε πρέπει να είσαι γρήγορος.
  breadcrumb:
    items:
      account-login:
        label: Σύνδεση
        icon: i-heroicons-arrow-right-on-rectangle
      account-login-code:
        label: Κωδικός μίας χρήσης
        icon: i-heroicons-envelope
      account-login-code-confirm:
        label: Επιβεβαίωση
        icon: i-heroicons-check-circle
</i18n>
