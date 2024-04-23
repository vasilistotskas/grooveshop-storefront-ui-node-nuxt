<script lang="ts" setup>
import type { UseSeoMetaInput } from '@unhead/schema'

const config = useRuntimeConfig()
const { t, locale } = useI18n()

const seoMetaOptions = {
  title: t('pages.products.title'),
} satisfies UseSeoMetaInput

const links = [
  {
    to: locale.value === config.public.defaultLocale ? '/' : `/${locale.value}`,
    label: t('breadcrumb.items.index.label'),
    icon: 'i-heroicons-home',
  },
  {
    to:
      locale.value === config.public.defaultLocale
        ? '/products'
        : `/${locale.value}/products`,
    label: t('breadcrumb.items.products.label'),
    current: true,
  },
]

useHydratedHead({
  title: () => t('pages.products.title'),
})
useSeoMeta(seoMetaOptions)

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container-fluid flex flex-col">
    <PageBody>
      <div class="container !p-0">
        <UBreadcrumb
          :links="links"
          class="
            mb-5

            md:pl-[3.5rem]
          "
          :ui="{
            li: 'text-primary-950 dark:text-primary-50',
            base: 'text-xs md:text-md',
          }"
        />
      </div>
      <div class="flex gap-4">
        <ProductsSidebar />
        <ProductsList />
      </div>
    </PageBody>
  </PageWrapper>
</template>
