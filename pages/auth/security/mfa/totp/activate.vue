<script lang="ts" setup>
definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper class="container flex flex-col gap-4 !p-0 md:gap-8">
    <PageTitle
      :text="$t('pages.auth.security.mfa.totp.activate.title')"
      class="capitalize"
    />
    <AuthSecurityNavbar />
    <PageBody>
      <div
        class="container-2xs dark:bg-primary-900 bg-primary-100 grid gap-4 rounded border border-gray-900/10 !p-4 dark:border-gray-50/[0.2] md:px-6"
      >
        <AuthMfaTotpActivate />
        <AuthMfaTotpActivateForm />
      </div>
    </PageBody>
  </PageWrapper>
</template>
