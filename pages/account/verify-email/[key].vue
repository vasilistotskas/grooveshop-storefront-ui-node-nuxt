<script lang="ts" setup>
const emit = defineEmits(['emailVerify'])

const { emailVerify, getEmailVerify } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()

const loading = ref(false)
const route = useRoute()

const { data: getVerifyEmailData } = await getEmailVerify(route.params.key)

async function onSubmit() {
  try {
    loading.value = true
    const data = await emailVerify({ key: route.params.key })
    if (data && [200, 401].includes(data.status)) {
      toast.add({
        title: t('common.success.title'),
        color: 'green',
      })
      emit('emailVerify')
      await navigateTo('/account/email')
    }
  }
  catch (error) {
    toast.add({
      title: t('common.error.default'),
      color: 'red',
    })
  }
}

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container-2xs grid gap-12">
    <PageTitle
      :text="$t('pages.account.verify-email.key.title')"
      class="text-center capitalize"
    />
    <PageBody class="grid items-center justify-center">
      <div class="flex flex-col items-center justify-center">
        <div
          v-if="getVerifyEmailData?.status === 200" class="
            flex flex-col items-center justify-center gap-4
          "
        >
          <p
            class="
              text-primary-950

              dark:text-primary-50
            "
          >
            {{ $t('pages.account.verify-email.key.please_confirm_that') }} <a
              :href="'mailto:' + getVerifyEmailData?.data.email"
            >{{ getVerifyEmailData?.data.email
            }}</a> {{ $t('pages.account.verify-email.key.is_an_email_address_for_user') }}
            {{ getVerifyEmailData?.data.user.username || getVerifyEmailData?.data.user.display }}.
          </p>
          <UButton
            :disabled="loading"
            :label="
              $t('common.confirm')
            "
            color="primary"
            size="xl"
            @click="onSubmit"
          />
        </div>
        <p
          v-else-if="!getVerifyEmailData?.data?.email" class="
            text-primary-950

            dark:text-primary-50
          "
        >
          {{ $t('pages.account.verify-email.key.invalid_verification_url') }}
        </p>
        <p
          v-else class="
            text-primary-950

            dark:text-primary-50
          "
        >
          Unable to confirm email
          {{ $t('pages.account.verify-email.key.unable_to_confirm_email') }}
          <UButton
            :external="true"
            :label="getVerifyEmailData.data.email"
            :to="'mailto:' + getVerifyEmailData.data.email"
            color="opposite"
            variant="link"
          />
          {{ $t('pages.account.verify-email.key.because_it_is_already_confirmed') }}
        </p>
      </div>
    </PageBody>
  </PageWrapper>
</template>
