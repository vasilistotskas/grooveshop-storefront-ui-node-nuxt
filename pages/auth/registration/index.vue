<script lang="ts" setup>
definePageMeta({
  layout: 'default',
  middleware: 'guest',
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
      :text="$t('pages.auth.registration.title')"
      class="text-center capitalize"
    />
    <PageBody>
      <AuthRegistrationForm />
    </PageBody>
  </PageWrapper>
</template>
