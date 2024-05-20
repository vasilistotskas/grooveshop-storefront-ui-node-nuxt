<script lang="ts" setup>
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
    <PageTitle
      :text="$t('pages.account.security.mfa.totp.authenticate.title')"
      class="text-center capitalize"
    />
    <AccountSecurityNavbar />
    <PageBody>
      <AccountMfaTotpAuthenticateForm />
    </PageBody>
  </PageWrapper>
</template>
