<script lang="ts" setup>
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
    to: localePath('account-signup'),
    label: t('breadcrumb.items.account-signup.label'),
    icon: t('breadcrumb.items.account-signup.icon'),
  },
  {
    to: localePath('account-signup-passkey'),
    label: t('breadcrumb.items.account-signup-passkey.label'),
    icon: t('breadcrumb.items.account-signup-passkey.icon'),
    current: true,
  },
])

useSeoMeta({
  title: t('title'),
})
useHead({
  title: t('title'),
})

definePageMeta({
  layout: 'default',
  middleware: 'guest',
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
    <PageTitle :text="t('title')" class="text-center" />
    <AccountSignupPasskeyForm />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Εγγραφή με κωδικό μιας χρήσης
  breadcrumb:
    items:
      account-signup:
        label: Εγγραφή
        icon: i-heroicons-arrow-right-on-rectangle
      account-signup-passkey:
        label: Κλειδί
        icon: i-heroicons-key
</i18n>
