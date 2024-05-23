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
      :text="$t('pages.account.signup.account-confirm-email.title')"
      class="text-center capitalize"
    />
    <PageBody>
      <ClientOnly>
        <LazyAlert
          v-if="!getVerifyEmailError"
          :close-button="false"
          :text="
            $t(
              'pages.account.signup.account-confirm-email.success.description',
            )
          "
          :title="`${$t('pages.account.signup.account-confirm-email.success.title')}`"
          :type="`success`"
        />
        <LazyAlert
          v-else
          :close-button="false"
          :text="
            $t(
              'pages.account.signup.account-confirm-email.error.description',
            )
          "
          :title="`${$t('pages.account.signup.account-confirm-email.error.title')}`"
          :type="`danger`"
        />
        <template #fallback>
          <ClientOnlyFallback
            :text="$t('pages.account.signup.account-confirm-email.loading')"
            :text-visibility="`visible`"
            height="130.8px"
          />
        </template>
      </ClientOnly>

      <div class="flex justify-center">
        <UButton
          v-if="!getVerifyEmailError"
          :label="
            $t('pages.account.signup.account-confirm-email.success.button')
          "
          :to="`/account/login`"
          color="primary"
          size="sm"
        />
      </div>
    </PageBody>
  </PageWrapper>
</template>
