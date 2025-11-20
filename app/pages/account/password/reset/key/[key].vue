<script lang="ts" setup>
const { t } = useI18n()
const { isMobileOrTablet } = useDevice()
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
    to: localePath('account-password-reset'),
    label: t('breadcrumb.items.account-password-reset.label'),
    icon: t('breadcrumb.items.account-password-reset.icon'),
  },
  {
    to: localePath('account-password-reset-key-key'),
    label: t('breadcrumb.items.account-password-reset-key.label'),
    icon: t('breadcrumb.items.account-password-reset-key.icon'),
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
      !mt-0 flex flex-col gap-0 p-0
      md:!mt-4
    "
  >
    <UBreadcrumb
      :items="items"
      :ui="{
        item: isMobileOrTablet ? `
          text-primary-950
          dark:text-primary-50
        ` : `
          text-primary-950
          dark:text-primary-50
        `,
        root: `
          text-xs
          md:text-base
        `,
      }"
      class="
        absolute z-10 mx-auto w-auto max-w-(--container-xl) bg-transparent !px-4
        !pt-2
        md:relative md:mb-5 md:w-full md:!pt-0
        dark:bg-transparent
      "
    />
    <UContainer
      class="
        mt-12 w-xl max-w-full
        sm:px-0
        md:mt-0
        lg:px-0
      "
    >
      <UPageCard variant="outline" class="w-full max-w-full">
        <div class="space-y-6">
          <div class="text-center">
            <div class="mb-4 inline-flex items-center justify-center">
              <UIcon name="i-heroicons-key" class="size-12 text-primary" />
            </div>
            <h1 class="text-2xl font-bold text-highlighted">
              {{ t('title') }}
            </h1>
            <p class="mt-2 text-sm text-muted">
              {{ t('description') }}
            </p>
          </div>

          <AccountPasswordResetConfirmForm />
        </div>
      </UPageCard>
    </UContainer>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επανέφερε τον κωδικό πρόσβασης
  description: Εισάγαγε τον νέο σου κωδικό πρόσβασης παρακάτω.
  breadcrumb:
    items:
      account-login:
        label: Σύνδεση
        icon: i-heroicons-arrow-right-on-rectangle
      account-password-reset:
        label: Επαναφορά
        icon: i-heroicons-lock-closed
      account-password-reset-key:
        label: Κωδικός επαναφοράς
        icon: i-heroicons-lock-closed
</i18n>
