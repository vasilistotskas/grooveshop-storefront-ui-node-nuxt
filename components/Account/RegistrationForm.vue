<script lang="ts" setup>
import { z } from 'zod'

const { signup } = useAllAuthAuthentication()

const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()

const loading = ref(false)

const ZodRegistration = z
  .object({
    email: z.string({ required_error: t('common.validation.required') }).email(t('common.validation.email.valid')),
    password: z.string({ required_error: t('common.validation.required') }).min(8, {
      message: t('pages.account.registration.form.password1.validation.min', {
        min: 8,
      }),
    }),
    password2: z.string({ required_error: t('common.validation.required') }).min(8, {
      message: t('pages.account.registration.form.password2.validation.min', {
        min: 8,
      }),
    }),
  })
  .refine(data => data.password === data.password2, {
    message: t('pages.account.registration.form.password2.validation.match'),
    path: ['password2'],
  })

const validationSchema = toTypedSchema(ZodRegistration)

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
      title: t('common.auth.registration.success'),
      color: 'green',
    })
  }
  catch (error) {
    handleRegistrationError(error)
  }
  finally {
    loading.value = false
  }
})

function handleRegistrationError(error: any) {
  const defaultErrorMessage = t('pages.account.registration.account-confirm-email.resend.error.title')
  if (!isErrorWithNestedData(error)) {
    throw error
  }
  const { data } = error.data.data

  if (data && data.flows) {
    for (const flow of data.flows) {
      if (flow.id === 'verify_email' && flow.is_pending) {
        toast.add({
          description: t(`common.auth.registration.error.${flow.id}`),
          color: 'red',
        })
        return
      }
    }
  }

  toast.add({
    title: defaultErrorMessage,
    color: 'red',
  })
}

const submitButtonLabel = computed(() => {
  if (submitCount.value > 5) {
    return t('common.validation.tooManyAttempts')
  }

  return !loading.value
    ? t('pages.account.registration.form.submit')
    : t('common.loading')
})
</script>

<template>
  <section class="grid">
    <form
      id="RegistrationForm"
      class="
        container-3xs

        md:px-6
      "
      name="RegistrationForm"
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
              " for="email"
            >{{
              $t('pages.account.registration.form.email.label')
            }}</label>
            <FormTextInput
              id="email"
              v-model="email"
              :bind="emailProps"
              name="email"
              type="email"
              autocomplete="email"
              :required="true"
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
            >{{ $t('pages.account.registration.form.password1.label') }}</label>
            <div class="relative grid items-center gap-2">
              <FormTextInput
                id="password"
                v-model="password"
                :bind="passwordProps"
                name="password"
                :type="showPassword1 ? 'text' : 'password'"
                autocomplete="current-password"
                :required="true"
              />
              <UButton
                class="absolute right-2 top-1/2 -translate-y-1/2 transform"
                type="button"
                color="primary"
                variant="ghost"
                :icon="
                  showPassword1 ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
                "
                :aria-label="$t('pages.account.registration.form.password1.show')"
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
            >{{ $t('pages.account.registration.form.password2.label') }}</label>
            <div class="relative grid items-center gap-2">
              <FormTextInput
                id="password2"
                v-model="password2"
                :bind="password2Props"
                name="password2"
                :type="showPassword2 ? 'text' : 'password'"
                autocomplete="current-password"
                :required="true"
              />
              <UButton
                class="absolute right-2 top-1/2 -translate-y-1/2 transform"
                type="button"
                color="primary"
                variant="ghost"
                :icon="
                  showPassword2 ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
                "
                :aria-label="$t('pages.account.registration.form.password2.show')"
                @click="showPassword2 = !showPassword2"
              />
            </div>
            <span
              v-if="errors.password2"
              class="relative px-4 py-3 text-xs text-red-600"
            >{{ errors.password2 }}</span>
          </div>

          <UButton
            size="xl"
            type="submit"
            color="primary"
            variant="soft"
            :disabled="loading || submitCount > 5"
            :aria-busy="loading"
            :label="
              submitButtonLabel"
            :loading="loading"
            block
          />

          <div class="flex items-center justify-end gap-2">
            <span
              class="
                text-primary-950 text-sm

                dark:text-primary-50
              "
            >{{
              $t('pages.account.registration.form.already_have_account')
            }}</span>
            <UButton
              size="lg"
              type="submit"
              color="opposite"
              variant="link"
              :label="$t('pages.account.login.title')"
              :to="localePath('/account/login')"
            />
          </div>
        </div>
      </div>
    </form>
  </section>
</template>
