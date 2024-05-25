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
      :text="$t('pages.account.security.mfa.totp.activate.title')"
      class="capitalize"
    />
    <AccountAuthNavbar />
    <PageBody>
      <div
        class="
          container-2xs bg-primary-100 grid gap-4 rounded !p-4

          dark:bg-primary-900

          md:px-6
        "
      >
        <AccountMfaTotpActivate />
        <AccountMfaTotpActivateForm />
      </div>
    </PageBody>
  </PageWrapper>
</template>
