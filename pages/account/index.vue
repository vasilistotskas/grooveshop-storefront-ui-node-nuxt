<script lang="ts" setup>
definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper>
    <PageHeader class="account-header">
      <PageTitle
        :text="$t('pages.account.index.title')"
        class="account-header-title"
      />
    </PageHeader>
    <PageBody>
      <PageSection />
    </PageBody>
  </PageWrapper>
</template>
