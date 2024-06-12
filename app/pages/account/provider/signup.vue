<script lang="ts" setup>
definePageMeta({
  layout: 'default',
})

const localePath = useLocalePath()
</script>

<template>
  <PageWrapper
    class="
      container-3xs flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="$t('pages.account.provider.signup.title')" class="
        text-center capitalize
      "
    />
    <div
      class="
        flex flex-col items-center justify-end

        sm:flex-row
      "
    >
      <span
        class="
          text-primary-950 text-sm

          dark:text-primary-50
        "
      >{{
        $t('pages.account.provider.signup.description')
      }}</span>

      <UButton
        :label="$t('common.login')"
        :to="localePath('/account/login')"
        color="opposite"
        size="md"
        type="button"
        variant="link"
      />
    </div>
    <PageBody>
      <AccountProviderSignup />
    </PageBody>
  </PageWrapper>
</template>
