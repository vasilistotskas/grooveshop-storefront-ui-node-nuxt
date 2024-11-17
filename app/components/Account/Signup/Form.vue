<script lang="ts" setup>
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'

const config = useRuntimeConfig()
const { signup } = useAllAuthAuthentication()
const authStore = useAuthStore()
const { hasSocialaccountProviders, status } = storeToRefs(authStore)

const { t } = useI18n({ useScope: 'local' })
const toast = useToast()
const localePath = useLocalePath()
const { isMobileOrTablet } = useDevice()

const loading = ref(false)

const ZodSignup = z
  .object({
    email: z.string({ required_error: t('validation.required') }).email(t('validation.email.valid')),
    password: z.string({ required_error: t('validation.required') }).min(8, {
      message: t('validation.min', {
        min: 8,
      }),
    }),
    password2: z.string({ required_error: t('validation.required') }).min(8, {
      message: t('validation.min', {
        min: 8,
      }),
    }),
  })
  .refine(data => data.password === data.password2, {
    message: t('password2.validation.match'),
    path: ['password2'],
  })

const validationSchema = toTypedSchema(ZodSignup)

const { defineField, handleSubmit, errors, submitCount } = useForm({
  validationSchema,
})

const [email, emailProps] = defineField('email', {
  validateOnBlur: false,
  validateOnModelUpdate: true,
})
const [password, passwordProps] = defineField('password', {
  validateOnBlur: false,
  validateOnModelUpdate: true,
})
const [password2, password2Props] = defineField('password2', {
  validateOnBlur: false,
  validateOnModelUpdate: true,
})

const showPassword1 = ref(false)
const showPassword2 = ref(false)

const onSubmit = handleSubmit(async (values) => {
  loading.value = true

  try {
    await signup({ email: values.email, password: values.password })
    toast.add({
      title: t('auth.signup.success'),
      color: 'green',
    })
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
})

const submitButtonLabel = computed(() => {
  if (submitCount.value > 5) {
    return t('validation.too_many_attempts')
  }

  return !loading.value
    ? t('submit')
    : t('loading')
})

const submitButtonDisabled = computed(() => {
  return loading.value || submitCount.value > 5
})
</script>

<template>
  <section class="relative grid">
    <div
      v-if="isMobileOrTablet" class="
        top-[-1px] h-64 bg-secondary absolute z-0 w-full

        dark:bg-secondary-dark
      "
    />
    <form
      id="SignupForm"
      class="
        z-10 !pt-12 container-2xs

        md:px-6 md:!pt-4
      "
      name="SignupForm"
      @submit.prevent="onSubmit"
    >
      <div
        class="h-full flex-wrap items-center justify-center rounded-lg p-0"
      >
        <div class="relative grid w-full gap-4">
          <div
            class="
              grid gap-6 py-8 shadow-lg bg-primary-100 rounded-lg px-4

              dark:bg-primary-900 dark:md:bg-transparent

              md:bg-transparent md:!p-0 md:shadow-none
            "
          >
            <div class="grid content-evenly items-center justify-center gap-1">
              <NuxtImg
                :style="{ objectFit: 'contain' }"
                :src="'/img/logo-border.png'"
                :width="isMobileOrTablet ? 100 : 140"
                :height="isMobileOrTablet ? 100 : 140"
                :alt="`${'Login Logo ' + config.public.appTitle}`"
                quality="100"
                preload
              />
            </div>
            <div class="grid content-evenly items-start gap-1">
              <label
                class="
                  text-xl font-bold text-secondary

                  dark:text-secondary-dark
                "
                for="email"
              >{{
                t('email.label')
              }}</label>
              <FormTextInput
                id="email"
                v-model="email"
                :bind="emailProps"
                :required="true"
                :size="'lg'"
                autocomplete="email"
                name="email"
                type="email"
              />
              <span
                v-if="errors.email"
                class="relative px-4 py-3 text-xs text-red-600"
              >{{ errors.email }}</span>
            </div>
            <div class="grid content-evenly items-start gap-1">
              <label
                class="
                  text-xl font-bold text-secondary

                  dark:text-secondary-dark
                "
                for="password"
              >{{ t('password1.label') }}</label>
              <div class="relative grid items-center gap-2">
                <FormTextInput
                  id="password"
                  v-model="password"
                  :bind="passwordProps"
                  :required="true"
                  :type="showPassword1 ? 'text' : 'password'"
                  autocomplete="current-password"
                  :size="'lg'"
                  name="password"
                />
                <UButton
                  :aria-label="t('password1.show')"
                  :icon="
                    showPassword1 ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
                  "
                  class="absolute right-2 top-1/2 -translate-y-1/2"
                  color="primary"
                  type="button"
                  variant="ghost"
                  @click="showPassword1 = !showPassword1"
                />
              </div>
              <span
                v-if="errors.password"
                class="relative px-4 py-3 text-xs text-red-600"
              >{{ errors.password }}</span>
            </div>
            <div class="grid content-evenly items-start gap-1">
              <label
                class="
                  text-xl font-bold text-secondary

                  dark:text-secondary-dark
                "
                for="password2"
              >{{ t('password2.label') }}</label>
              <div class="relative grid items-center gap-2">
                <FormTextInput
                  id="password2"
                  v-model="password2"
                  :bind="password2Props"
                  :required="true"
                  :type="showPassword2 ? 'text' : 'password'"
                  :size="'lg'"
                  autocomplete="current-password"
                  name="password2"
                />
                <UButton
                  :aria-label="t('password2.show')"
                  :icon="
                    showPassword2 ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
                  "
                  class="absolute right-2 top-1/2 -translate-y-1/2"
                  color="primary"
                  type="button"
                  variant="ghost"
                  @click="showPassword2 = !showPassword2"
                />
              </div>
              <span
                v-if="errors.password2"
                class="relative px-4 py-3 text-xs text-red-600"
              >{{ errors.password2 }}</span>
            </div>
            <div
              class="
                flex flex-col justify-between gap-2

                sm:flex-row sm:items-center
              "
            >
              <UButton
                :label="t('passkey_login')"
                :to="localePath('account-signup-passkey')"
                class="
                  p-0 text-secondary font-semibold

                  dark:text-secondary-dark
                "
                color="opposite"
                size="md"
                type="button"
                variant="link"
              />
              <div class="flex items-center gap-2">
                <span
                  class="
                    text-secondary text-sm font-semibold

                    dark:text-secondary-dark
                  "
                >{{
                  t('already_have_account')
                }}</span>
                <UButton
                  class="
                    p-0 text-secondary font-semibold underline

                    dark:text-secondary-dark
                  "
                  :label="t('login')"
                  :to="localePath('account-login')"
                  size="lg"
                  color="opposite"
                  type="button"
                  variant="link"
                />
              </div>
            </div>

            <UButton
              class="
                text-white bg-secondary

                dark:bg-secondary-dark
              "
              :aria-busy="loading"
              :disabled="submitButtonDisabled"
              :label="
                submitButtonLabel"
              :loading="loading"
              block
              size="xl"
              type="submit"
              variant="solid"
            />
          </div>
          <div class="grid gap-4">
            <div
              v-if="hasSocialaccountProviders && status.config === 'success'" class="
                grid gap-4
              "
            >
              <div
                class="
                  my-2 flex items-center

                  after:mt-0.5 after:flex-1 after:border-t
                  after:border-neutral-300

                  before:mt-0.5 before:flex-1 before:border-t
                  before:border-neutral-300
                "
              >
                <p
                  class="mx-4 text-center font-semibold"
                >
                  {{ $t('or.title') }}
                </p>
              </div>
              <div
                class="
                  grid items-center justify-center gap-4

                  md:pt-8
                "
              >
                <p
                  class="
                    text-primary-950 text-sm font-semibold

                    dark:text-primary-50
                  "
                >
                  {{ t('social.title') }}
                </p>
                <div class="flex items-center justify-center gap-4">
                  <AccountProviderList />
                </div>
              </div>
            </div>
            <div v-else-if="status.config === 'pending'" class="grid gap-4">
              <ClientOnlyFallback
                class="my-2"
                height="24px"
                width="100%"
              />
              <ClientOnlyFallback
                height="80px"
                width="100%"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  </section>
</template>

<i18n lang="yaml">
el:
  login: Σύνδεση
  passkey_login: Εγγραφή με κωδικό μιας χρήσης
  email:
    label: Email
    validation:
      email: Το email πρέπει να είναι έγκυρη διεύθυνση email
  password1:
    label: Κωδικός πρόσβασης
    show: Δείξε τον κωδικό
    validation:
      min: Ο κωδικός πρόσβασης πρέπει να αποτελείται από τουλάχιστον {min}
        χαρακτήρες
  password2:
    label: Επιβεβαίωση κωδικού πρόσβασης
    show: Δείξε τον κωδικό
    validation:
      min: Η επιβεβαίωση κωδικού πρόσβασης πρέπει να αποτελείται από τουλάχιστον
        {min} χαρακτήρες
      match: Η επιβεβαίωση κωδικού πρόσβασης πρέπει να ταιριάζει με τον κωδικό
        πρόσβασης
  submit: Εγγραφή
  already_have_account: Έχεις ήδη λογαριασμό?
  social:
    title: Ή εγγράψου μέσω ενός τρίτου παρόχου
</i18n>
