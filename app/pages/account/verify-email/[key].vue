<script lang="ts" setup>
const emit = defineEmits(['emailVerify'])

const { emailVerify, getEmailVerify } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { $i18n } = useNuxtApp()
const router = useRouter()
const { isMobileOrTablet } = useDevice()

const loading = ref(false)

const key = 'key' in route.params ? route.params.key : undefined

const { data: getVerifyEmailData } = await useAsyncData(
  'verifyEmail',
  () => getEmailVerify(String(key)),
)

const items = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('account-login'),
    label: t('breadcrumb.items.account-login.label'),
    icon: t('breadcrumb.items.account-login.icon'),
  },
  {
    to: localePath('account-verify-email-key'),
    label: t('breadcrumb.items.account-verify-email-key.label'),
    icon: t('breadcrumb.items.account-verify-email-key.icon'),
    current: true,
  },
])

async function onSubmit(): Promise<void> {
  try {
    loading.value = true
    const data = await emailVerify({ key: String(key) })

    if (data && [200, 401].includes(data.status)) {
      toast.add({
        title: t('auth.email.verified'),
        description: t('success.description'),
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })

      emit('emailVerify')
      await router.push(localePath('account'))
    }
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper
    class="
      !mt-0 flex flex-col gap-0 p-0
      md:!mt-4
    "
  >
    <UBreadcrumb
      :items="items"
      :ui="{
        item: isMobileOrTablet ? 'text-primary-950 dark:text-primary-50' : 'text-primary-950 dark:text-primary-50',
        root: 'text-xs md:text-base',
      }"
      class="
        absolute z-10 mx-auto w-auto max-w-(--container-xl) bg-transparent !px-4
        !pt-2
        md:relative md:mb-5 md:w-full md:!pt-0
        dark:bg-transparent
      "
    />
    <UContainer
      class="
        mt-12 w-xl max-w-full
        sm:px-0
        md:mt-0
        lg:px-0
      "
    >
      <UPageCard variant="outline" class="w-full max-w-full">
        <div class="space-y-6">
          <div
            v-if="getVerifyEmailData?.status === 200"
            class="space-y-6"
          >
            <div class="text-center">
              <div class="mb-4 inline-flex items-center justify-center">
                <UIcon
                  name="i-heroicons-shield-check" class="size-12 text-success"
                />
              </div>
              <h1 class="text-2xl font-bold text-highlighted">
                {{ t('title') }}
              </h1>
            </div>

            <UAlert
              color="info"
              variant="soft"
              icon="i-heroicons-information-circle"
            >
              <template #description>
                <div class="space-y-2">
                  <p>
                    {{ t('please_confirm_that') }}
                    <span class="font-semibold text-primary">
                      {{ getVerifyEmailData.data.email }}
                    </span>
                    {{ t('is_an_email_address_for_user') }}
                    <span class="font-semibold">
                      {{ getVerifyEmailData.data.user.username || getVerifyEmailData.data.user.display }}
                    </span>.
                  </p>
                </div>
              </template>
            </UAlert>

            <UButton
              :loading="loading"
              :disabled="loading"
              block
              size="xl"
              color="success"
              variant="subtle"
              icon="i-heroicons-check-badge"
              @click="onSubmit"
            >
              {{ $i18n.t('confirm') }}
            </UButton>
          </div>

          <div
            v-else-if="!getVerifyEmailData?.data?.email"
            class="space-y-6"
          >
            <div class="text-center">
              <div class="mb-4 inline-flex items-center justify-center">
                <UIcon
                  name="i-heroicons-exclamation-triangle" class="
                    size-12 text-error
                  "
                />
              </div>
              <h1 class="text-2xl font-bold text-highlighted">
                {{ t('error.invalid_title') }}
              </h1>
            </div>

            <UAlert
              color="error"
              variant="soft"
              icon="i-heroicons-x-circle"
              :title="t('invalid_verification_url')"
              :description="t('error.invalid_description')"
            />

            <UButton
              :to="localePath('index')"
              block
              size="lg"
              variant="outline"
              icon="i-heroicons-home"
            >
              {{ t('back_to_home') }}
            </UButton>
          </div>

          <div
            v-else
            class="space-y-6"
          >
            <div class="text-center">
              <div class="mb-4 inline-flex items-center justify-center">
                <UIcon
                  name="i-heroicons-check-badge" class="size-12 text-success"
                />
              </div>
              <h1 class="text-2xl font-bold text-highlighted">
                {{ t('already_confirmed.title') }}
              </h1>
            </div>

            <UAlert
              color="success"
              variant="soft"
              icon="i-heroicons-check-circle"
            >
              <template #description>
                <div class="space-y-2">
                  <p>
                    {{ t('unable_to_confirm_email') }}
                    <span class="font-semibold text-success">
                      {{ getVerifyEmailData.data.email }}
                    </span>
                    {{ t('because_it_is_already_confirmed') }}
                  </p>
                </div>
              </template>
            </UAlert>

            <div class="flex flex-col gap-3">
              <UButton
                :to="localePath('account')"
                block
                size="lg"
                icon="i-heroicons-user-circle"
              >
                {{ t('go_to_account') }}
              </UButton>

              <UButton
                :to="localePath('index')"
                block
                size="lg"
                variant="outline"
                icon="i-heroicons-home"
              >
                {{ t('back_to_home') }}
              </UButton>
            </div>
          </div>
        </div>
      </UPageCard>
    </UContainer>
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
  back_to_home: Επιστροφή στην αρχική
  go_to_account: Μετάβαση στο λογαριασμό
  success:
    description: Το email σας επιβεβαιώθηκε επιτυχώς!
  error:
    invalid_title: Μη έγκυρος σύνδεσμος
    invalid_description: Ο σύνδεσμος επιβεβαίωσης δεν είναι έγκυρος ή έχει λήξει. Παρακαλώ ζήτησε νέο σύνδεσμο επιβεβαίωσης.
  already_confirmed:
    title: Ήδη επιβεβαιωμένο
  breadcrumb:
    items:
      account-login:
        label: Σύνδεση
        icon: i-heroicons-arrow-right-on-rectangle
      account-verify-email-key:
        label: Επιβεβαίωση
        icon: i-heroicons-check
</i18n>
