<script lang="ts" setup>
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
    <PageTitle :text="$t('pages.account.favourites.products.title')" />
    <UserAccountFavouritesNavbar v-if="enabled" />
    <PageBody>
      <ProductFavouritesList />
    </PageBody>
  </PageWrapper>
</template>
