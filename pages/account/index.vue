<script lang="ts" setup>
definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper>
    <PageTitle
      :text="$t('pages.account.index.title')"
      class="account-header-title"
    />
    <PageBody>
      <PageSection />
    </PageBody>
  </PageWrapper>
</template>
