<script lang="ts" setup>
definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container flex flex-col">
    <PageHeader>
      <PageTitle
        :text="$t('pages.privacy.title')"
        class="text-center capitalize"
      />
    </PageHeader>
    <PageBody>
      <div />
    </PageBody>
  </PageWrapper>
</template>
