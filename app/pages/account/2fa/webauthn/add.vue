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
      :text="$t('pages.account.2fa.webauthn.add.title')"
      class="text-center capitalize"
    />
    <PageBody>
      <div
        class="
          container-2xs grid gap-4 rounded !p-0

          md:px-6
        "
      >
        <Account2FaWebAuthnAddForm />
      </div>
    </PageBody>
  </PageWrapper>
</template>
