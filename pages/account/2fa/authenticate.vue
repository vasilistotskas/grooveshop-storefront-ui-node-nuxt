<script lang="ts" setup>
definePageMeta({
  layout: 'auth',
})
</script>

<template>
  <PageWrapper
    class="
      container-3xs flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="$t('pages.account.2fa.authenticate.title')"
      class="text-center capitalize"
    />
    <PageBody>
      <p
        class="
          text-primary-950 text-center

          dark:text-primary-50
        "
      >
        {{ $t('pages.account.2fa.authenticate.description') }}
      </p>
      <Account2FaAuthenticateForm />
    </PageBody>
  </PageWrapper>
</template>
