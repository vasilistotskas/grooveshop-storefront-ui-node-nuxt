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
      :text="$t('pages.account.verify-email.title')" class="
        text-center capitalize
      "
    />
    <p
      class="
        text-primary-950 text-center

        dark:text-primary-50
      "
    >
      {{ $t('pages.account.verify-email.description') }}
    </p>
  </PageWrapper>
</template>
