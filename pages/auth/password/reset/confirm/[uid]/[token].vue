<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  middleware: 'guest',
})
</script>

<template>
  <PageWrapper class="container flex flex-col gap-4 md:gap-8">
    <PageTitle
      :text="$t('pages.auth.password.reset.confirm.title')"
      class="text-center capitalize"
    />
    <PageBody>
      <AuthPasswordResetConfirmForm />
    </PageBody>
  </PageWrapper>
</template>
