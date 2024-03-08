<script lang="ts" setup>
definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper class="container flex flex-col gap-4 md:gap-8">
    <PageHeader>
      <PageTitle :text="$t('pages.auth.security.title')" />
    </PageHeader>
    <AuthSecurityNavbar />
    <PageBody />
  </PageWrapper>
</template>
