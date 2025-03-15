<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()
const { isMobileOrTablet } = useDevice()
const { $i18n } = useNuxtApp()

const links = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('account-signup'),
    label: t('breadcrumb.items.account-signup.label'),
    icon: t('breadcrumb.items.account-signup.icon'),
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
      !mt-0 flex flex-col gap-0

      md:!mt-4
    "
  >
    <PageTitle
      :text="t('title')"
      class="sr-only text-center capitalize"
    />

    <UBreadcrumb
      :links="links"
      :ui="{
        li: isMobileOrTablet ? 'text-primary-950 dark:text-primary-50' : 'text-primary-950 dark:text-primary-50',
        base: 'text-xs md:text-md',
      }"
      class="
          absolute z-10 container-3xs bg-transparent !pt-2

          dark:bg-transparent

          md:relative md:mb-5 md:!pt-0
        "
    />
    <UCard
      class="container-3xs !p-0"
      :ui="{
        body: {
          padding: isMobileOrTablet? '' : 'px-4 py-5 sm:p-6',
        },
      }"
    >
      <AccountSignupForm />
    </UCard>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Εγγραφή
  breadcrumb:
    items:
      account-signup:
        label: Εγγραφή
        icon: i-heroicons-arrow-right-on-rectangle
</i18n>
