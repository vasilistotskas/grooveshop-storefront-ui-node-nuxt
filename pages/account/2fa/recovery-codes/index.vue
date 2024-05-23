<script lang="ts" setup>
definePageMeta({
  layout: 'user',
  keepalive: false,
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
      :text="$t('pages.account.security.mfa.recovery.codes.title')"
      class="text-center capitalize"
    />
    <AccountSecurityNavbar />
    <PageBody>
      <AccountMfaRecoveryCodes />
    </PageBody>
  </PageWrapper>
</template>
