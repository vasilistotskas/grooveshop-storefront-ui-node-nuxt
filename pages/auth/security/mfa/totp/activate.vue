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
        class="container-xxs grid gap-4 rounded border border-gray-900/10 bg-white !p-4 dark:border-gray-50/[0.2] dark:bg-zinc-800 md:px-6"
      >
        <AuthMfaTotpActivate />
        <AuthMfaTotpActivateForm />
      </div>
    </PageBody>
  </PageWrapper>
</template>
