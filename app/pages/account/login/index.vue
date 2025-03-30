<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()
const { isMobileOrTablet } = useDevice()
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
    <PageTitle
      :text="t('title')"
      class="sr-only text-center capitalize"
    />

    <UBreadcrumb
      :items="items"
      :ui="{
        item: isMobileOrTablet ? 'text-primary-950 dark:text-primary-50' : 'text-primary-950 dark:text-primary-50',
        root: 'text-xs md:text-md',
      }"
      class="
          absolute z-10 max-w-(--container-xl) w-auto mx-auto bg-transparent !pt-2 !px-4

          dark:bg-transparent

          md:relative md:mb-5 md:!pt-0 md:w-full
        "
    />
    <UCard
      class="max-w-(--container-xl) w-full mx-auto !p-0"
      :ui="{
        root: isMobileOrTablet? 'rounded-none ring-0' : '',
        body: isMobileOrTablet? 'p-0' : 'px-4 py-5 sm:p-6',
      }"
    >
      <AccountLoginForm />
    </UCard>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Σύνδεση
  breadcrumb:
    items:
      account-login:
        label: Σύνδεση
        icon: i-heroicons-arrow-right-on-rectangle
</i18n>
