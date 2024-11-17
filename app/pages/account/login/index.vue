<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()
const { isMobileOrTablet } = useDevice()

const links = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: 'i-heroicons-home',
  },
  {
    to: localePath('account-login'),
    label: t('breadcrumb.items.account-login.label'),
    icon: 'i-heroicons-arrow-right-on-rectangle',
    current: true,
  },
])

useSeoMeta({
  title: t('title'),
})
useHydratedHead({
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
    <PageBody>
      <UBreadcrumb
        :links="links"
        :ui="{
          li: isMobileOrTablet ? 'text-primary-50 dark:text-primary-50' : 'text-primary-950 dark:text-primary-50',
          base: 'text-xs md:text-md',
        }"
        class="
          container-2xs !pt-2 bg-secondary

          dark:bg-secondary-dark

          md:mb-5 md:bg-transparent md:!pt-0 md:dark:bg-transparent
        "
      />
      <AccountLoginForm />
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Σύνδεση
</i18n>
