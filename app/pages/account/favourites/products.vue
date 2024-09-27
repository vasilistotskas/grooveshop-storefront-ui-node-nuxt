<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const { enabled } = useAuthPreviewMode()

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      container flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle :text="t('title')" />
    <LazyUserAccountFavouritesNavbar v-if="enabled" />
    <PageBody>
      <ProductFavouritesList />
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Αγαπημένα Προϊόντα
</i18n>
