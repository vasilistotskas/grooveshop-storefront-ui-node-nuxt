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
    to: localePath('account-login'),
    label: t('breadcrumb.items.account-login.label'),
    icon: t('breadcrumb.items.account-login.icon'),
  },
  {
    to: localePath('account-login-code'),
    label: t('breadcrumb.items.account-login-code.label'),
    icon: t('breadcrumb.items.account-login-code.icon'),
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
    <p
      class="
        text-primary-950 text-center

        dark:text-primary-50
      "
    >
      {{ t('description') }}
    </p>

    <AccountLoginCodeForm />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Στείλε μου έναν κωδικό σύνδεσης
  description: Θα λάβεις ένα email που περιέχει έναν ειδικό κωδικό.
  breadcrumb:
    items:
      account-login:
        label: Σύνδεση
        icon: i-heroicons-arrow-right-on-rectangle
      account-login-code:
        label: Κωδικός μίας χρήσης
        icon: i-heroicons-envelope
</i18n>
