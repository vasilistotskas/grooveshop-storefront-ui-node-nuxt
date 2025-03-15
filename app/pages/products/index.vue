<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const links = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('products'),
    label: t('breadcrumb.items.products.label'),
    current: true,
  },
])

useHead({
  title: t('title'),
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container-fluid flex flex-col">
    <div class="container !p-0">
      <UBreadcrumb
        :links="links"
        :ui="{
          li: 'text-primary-950 dark:text-primary-50',
          base: 'text-xs md:text-md',
        }"
        class="
            mb-5

            md:px-0
          "
      />
    </div>
    <div class="flex gap-4">
      <ProductsSidebar />
      <ProductsList />
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Προϊόντα
  breadcrumb:
    items:
      products:
        label: Προϊόντα
</i18n>
