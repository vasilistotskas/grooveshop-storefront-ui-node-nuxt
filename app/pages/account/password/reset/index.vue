<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()

const links = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('account-login'),
    label: t('breadcrumb.items.account-login.label'),
    icon: t('breadcrumb.items.account-login.icon'),
  },
  {
    to: localePath('account-password-reset'),
    label: t('breadcrumb.items.account-password-reset.label'),
    icon: t('breadcrumb.items.account-password-reset.icon'),
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
      container-3xs flex flex-col gap-4 md:!p-0

      md:gap-8
    "
  >
    <UBreadcrumb
      :links="links"
      :ui="{
        li: 'text-primary-950 dark:text-primary-50',
        base: 'text-xs md:text-md',
      }"
      class="container-3xs relative mb-5 min-w-0"
    />
    <PageTitle
      :text="t('title')"
      class="text-center capitalize"
    />
    <p
      class="
          text-primary-950 text-center

          dark:text-primary-50
        "
    >
      {{ t('description') }}
    </p>
    <AccountPasswordResetForm />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επαναφορά κωδικού πρόσβασης
  description: |-
    Εισήγαγε την επαληθευμένη διεύθυνση email του λογαριασμού χρήστη σου
      για να λάβεις έναν σύνδεσμο επαναφοράς κωδικού πρόσβασης.
  breadcrumb:
    items:
      account-login:
        label: Σύνδεση
        icon: i-heroicons-arrow-right-on-rectangle
      account-password-reset:
        label: Επαναφορά
        icon: i-heroicons-lock-closed
</i18n>
