<script lang="ts" setup>
const authStore = useAuthStore()
const { hasCurrentPassword } = storeToRefs(authStore)

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
      :text="hasCurrentPassword ? $t('pages.account.password.change.title') : $t('pages.account.password.set.title')"
      class="text-center capitalize"
    />
    <PageBody>
      <p
        class="
          text-primary-950 text-center

          dark:text-primary-50
        "
      >
        {{ hasCurrentPassword ? $t('pages.account.password.change.description') : $t('pages.account.password.set.description')
        }}
      </p>
      <AccountPasswordChangeForm />
    </PageBody>
  </PageWrapper>
</template>
