<script lang="ts" setup>
import type { UseSeoMetaInput } from '@unhead/schema'

const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()

const seoMetaInput = {
  title: t('title'),
} satisfies UseSeoMetaInput

const links = computed(() => [
  {
    to: localePath('/'),
    label: t('breadcrumb.items.index.label'),
    icon: 'i-heroicons-home',
  },
  {
    to: localePath('/products'),
    label: t('breadcrumb.items.products.label'),
    current: true,
  },
])

useHydratedHead({
  title: () => t('title'),
})
useSeoMeta(seoMetaInput)

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
          :ui="{
            li: 'text-primary-950 dark:text-primary-50',
            base: 'text-xs md:text-md',
          }"
          class="
            mb-5

            md:pl-[3.5rem]
          "
        />
      </div>
      <div class="flex gap-4">
        <ProductsSidebar />
        <ProductsList />
      </div>
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Προϊόντα
</i18n>
