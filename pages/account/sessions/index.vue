<script lang="ts" setup>
definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      container-2xs flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="$t('pages.account.sessions.title')" class="text-center"
    />
    <PageBody>
      <AccountSessionsManage />
    </PageBody>
  </PageWrapper>
</template>
