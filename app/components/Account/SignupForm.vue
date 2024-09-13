<script lang="ts" setup>
import { z } from 'zod'

const { signup } = useAllAuthAuthentication()
const authStore = useAuthStore()
const { hasProviders, status } = storeToRefs(authStore)

const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()

const loading = ref(false)

const ZodSignup = z
  .object({
    email: z.string({ required_error: t('common.validation.required') }).email(t('common.validation.email.valid')),
    password: z.string({ required_error: t('common.validation.required') }).min(8, {
      message: t('pages.account.signup.form.password1.validation.min', {
        min: 8,
      }),
    }),
    password2: z.string({ required_error: t('common.validation.required') }).min(8, {
      message: t('pages.account.signup.form.password2.validation.min', {
        min: 8,
      }),
    }),
  })
  .refine(data => data.password === data.password2, {
    message: t('pages.account.signup.form.password2.validation.match'),
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
      title: t('common.auth.signup.success'),
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
    return t('common.validation.tooManyAttempts')
  }

  return !loading.value
    ? t('pages.account.signup.form.submit')
    : t('common.loading')
})

const submitButtonDisabled = computed(() => {
  return loading.value || submitCount.value > 5
})
</script>

<template>
  <section class="grid">
    <form
      id="SignupForm"
      class="
        container-3xs

        md:px-6
      "
      name="SignupForm"
      @submit.prevent="onSubmit"
    >
      <div
        class="
          bg-primary-100 flex h-full flex-wrap items-center justify-center
          rounded-[0.5rem] p-4 shadow-[0_4px_9px_-4px_#0000000d]

          dark:bg-primary-900 dark:shadow-[0_4px_9px_-4px_#0000000d]

          lg:justify-between

          md:p-8
        "
      >
        <div class="relative grid w-full gap-4">
          <div class="grid content-evenly items-start gap-1">
            <label
              class="
                text-primary-950

                dark:text-primary-50
              "
              for="email"
            >{{
              $t('pages.account.signup.form.email.label')
            }}</label>
            <FormTextInput
              id="email"
              v-model="email"
              :bind="emailProps"
              :required="true"
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
                text-primary-950

                dark:text-primary-50
              "
              for="password"
            >{{ $t('pages.account.signup.form.password1.label') }}</label>
            <div class="relative grid items-center gap-2">
              <FormTextInput
                id="password"
                v-model="password"
                :bind="passwordProps"
                :required="true"
                :type="showPassword1 ? 'text' : 'password'"
                autocomplete="current-password"
                name="password"
              />
              <UButton
                :aria-label="$t('pages.account.signup.form.password1.show')"
                :icon="
                  showPassword1 ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
                "
                class="absolute right-2 top-1/2 -translate-y-1/2 transform"
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
                text-primary-950

                dark:text-primary-50
              "
              for="password2"
            >{{ $t('pages.account.signup.form.password2.label') }}</label>
            <div class="relative grid items-center gap-2">
              <FormTextInput
                id="password2"
                v-model="password2"
                :bind="password2Props"
                :required="true"
                :type="showPassword2 ? 'text' : 'password'"
                autocomplete="current-password"
                name="password2"
              />
              <UButton
                :aria-label="$t('pages.account.signup.form.password2.show')"
                :icon="
                  showPassword2 ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
                "
                class="absolute right-2 top-1/2 -translate-y-1/2 transform"
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
          <UButton
            :aria-busy="loading"
            :disabled="submitButtonDisabled"
            :label="
              submitButtonLabel"
            :loading="loading"
            block
            color="primary"
            size="xl"
            type="submit"
            variant="soft"
          />

          <div class="flex items-center justify-end gap-2">
            <span
              class="
                text-primary-950 text-sm

                dark:text-primary-50
              "
            >{{
              $t('pages.account.signup.form.already_have_account')
            }}</span>
            <UButton
              :label="$t('pages.account.login.title')"
              :to="localePath('/account/login')"
              color="opposite"
              size="lg"
              type="submit"
              variant="link"
            />
          </div>

          <div
            v-if="hasProviders && status.config === 'success'" class="grid gap-4"
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
                class="
                  mx-4 text-center font-semibold

                  dark:text-neutral-200
                "
              >
                {{ $t('common.or.title') }}
              </p>
            </div>
            <div class="grid items-center justify-center gap-4">
              <p
                class="
                  text-primary-950

                  dark:text-primary-50
                "
              >
                {{ $t('pages.account.signup.form.social.title') }}
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
    </form>
  </section>
</template>
