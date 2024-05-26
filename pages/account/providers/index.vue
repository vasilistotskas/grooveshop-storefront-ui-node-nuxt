<script lang="ts" setup>
definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      container-3xs flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="$t('pages.account.providers.title')" class="text-center capitalize"
    />
    <PageBody>
      <AccountProvidersManage />
    </PageBody>
  </PageWrapper>
</template>
