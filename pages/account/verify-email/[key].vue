<script lang="ts" setup>
const { emailVerify, getEmailVerify } = useAllAuthAuthentication()
const route = useRoute()

const { error: getVerifyEmailError } = await getEmailVerify(route.params.key)

if (!getVerifyEmailError.value) {
  await emailVerify({ key: route.params.key })
}

definePageMeta({
  layout: 'default',
  middleware: 'guest',
})
</script>

<template>
  <PageWrapper class="container-2xs grid gap-12">
    <PageTitle
      :text="$t('pages.account.registration.account-confirm-email.title')"
      class="text-center capitalize"
    />
    <PageBody>
      <ClientOnly>
        <LazyAlert
          v-if="!getVerifyEmailError"
          :title="`${$t('pages.account.registration.account-confirm-email.success.title')}`"
          :text="
            $t(
              'pages.account.registration.account-confirm-email.success.description',
            )
          "
          :type="`success`"
          :close-button="false"
        />
        <LazyAlert
          v-else
          :title="`${$t('pages.account.registration.account-confirm-email.error.title')}`"
          :text="
            $t(
              'pages.account.registration.account-confirm-email.error.description',
            )
          "
          :type="`danger`"
          :close-button="false"
        />
        <template #fallback>
          <ClientOnlyFallback
            height="130.8px"
            :text="$t('pages.account.registration.account-confirm-email.loading')"
            :text-visibility="`visible`"
          />
        </template>
      </ClientOnly>

      <div class="flex justify-center">
        <UButton
          v-if="!getVerifyEmailError"
          color="primary"
          size="sm"
          :label="
            $t('pages.account.registration.account-confirm-email.success.button')
          "
          :to="`/account/login`"
        />
      </div>
    </PageBody>
  </PageWrapper>
</template>
