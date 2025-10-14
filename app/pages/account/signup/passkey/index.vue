<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()
const { isMobileOrTablet } = useDevice()

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
      !mt-0 flex flex-col gap-0 p-0
      md:!mt-4
    "
  >
    <UBreadcrumb
      :items="items"
      :ui="{
        item: isMobileOrTablet ? 'text-primary-950 dark:text-primary-50' : 'text-primary-950 dark:text-primary-50',
        root: 'text-xs md:text-base',
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
              {{ t('subtitle') }}
            </p>
          </div>

          <UAlert
            color="info"
            variant="soft"
            icon="i-heroicons-information-circle"
          >
            <template #title>
              {{ t('info.title') }}
            </template>
            <template #description>
              {{ t('info.description') }}
            </template>
          </UAlert>

          <AccountSignupPasskeyForm />
        </div>
      </UPageCard>
    </UContainer>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Εγγραφή με κωδικό μιας χρήσης
  subtitle: Χρησιμοποίησε το κλειδί πρόσβασης για ασφαλή σύνδεση
  info:
    title: Τι είναι το κλειδί πρόσβασης;
    description: Τα κλειδιά πρόσβασης είναι ασφαλέστερα από κωδικούς πρόσβασης και χρησιμοποιούν τη βιομετρική σου ταυτοποίηση ή το PIN της συσκευής σου.
  breadcrumb:
    items:
      account-signup:
        label: Εγγραφή
        icon: i-heroicons-arrow-right-on-rectangle
      account-signup-passkey:
        label: Κλειδί
        icon: i-heroicons-key
</i18n>
