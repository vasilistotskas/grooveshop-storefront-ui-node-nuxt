<script lang="ts" setup>
const emit = defineEmits(['emailVerify'])

const { emailVerify, getEmailVerify } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { $i18n } = useNuxtApp()

const loading = ref(false)

const key = 'key' in route.params
  ? route.params.key
  : undefined

const { data: getVerifyEmailData } = await useAsyncData(
  'verifyEmail',
  () => getEmailVerify(String(key)),
)

async function onSubmit() {
  try {
    loading.value = true
    const data = await emailVerify({ key: String(key) })
    if (data && [200, 401].includes(data.status)) {
      toast.add({
        title: t('auth.email.verified'),
        color: 'success',
      })
      emit('emailVerify')
      await navigateTo(localePath('account'))
    }
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
}

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="grid">
    <div
      class="
        flex flex-col gap-8
        md:gap-12
      "
    >
      <PageTitle
        :text="t('title')"
        class="text-center capitalize"
      />

      <div class="flex flex-col items-center justify-center">
        <div
          v-if="getVerifyEmailData?.status === 200"
          class="flex flex-col items-center justify-center gap-4"
        >
          <p
            class="
              text-primary-950
              dark:text-primary-50
            "
          >
            {{ t('please_confirm_that') }} <a
              :href="'mailto:' + getVerifyEmailData?.data.email"
            >{{ getVerifyEmailData?.data.email
            }}</a> {{ t('is_an_email_address_for_user') }}
            {{ getVerifyEmailData?.data.user.username || getVerifyEmailData?.data.user.display }}.
          </p>
          <UButton
            :disabled="loading"
            :label="
              $i18n.t('confirm')
            "
            color="neutral"
            size="xl"
            @click="onSubmit"
          />
        </div>
        <p
          v-else-if="!getVerifyEmailData?.data?.email"
          class="
            text-primary-950
            dark:text-primary-50
          "
        >
          {{ t('invalid_verification_url') }}
        </p>
        <p
          v-else
          class="
            text-primary-950
            dark:text-primary-50
          "
        >
          {{ t('unable_to_confirm_email') }}
          <UButton
            :external="true"
            :label="getVerifyEmailData.data.email"
            :to="'mailto:' + getVerifyEmailData.data.email"
            color="secondary"
            variant="link"
          />
          {{ t('because_it_is_already_confirmed') }}
        </p>
      </div>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επιβεβαίωση διεύθυνσης ηλεκτρονικού ταχυδρομείου
  please_confirm_that: Παρακαλώ επιβεβαίωσε ότι η διεύθυνση
  is_an_email_address_for_user: ανήκει στον χρήστη
  invalid_verification_url: Μη έγκυρος σύνδεσμος επαλήθευσης
  unable_to_confirm_email: Αδυναμία επιβεβαίωσης email
  because_it_is_already_confirmed: επειδή είναι ήδη επιβεβαιωμένο
</i18n>
