<script lang="ts" setup>
definePageMeta({
  layout: 'auth',
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
      :text="$t('pages.2fa.authenticate.title')"
      class="text-center capitalize"
    />
    <PageBody>
      <Account2FaAuthenticateForm />
    </PageBody>
  </PageWrapper>
</template>
