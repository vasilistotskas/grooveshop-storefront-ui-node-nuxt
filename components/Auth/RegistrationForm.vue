<script lang="ts" setup>
import { z } from 'zod'

const { fetch } = useUserSession()
const { register, registrationResendEmail } = useAuth()

const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()

const loading = ref(false)

const ZodRegistration = z
  .object({
    email: z.string({ required_error: t('common.validation.required') }).email(t('common.validation.email.valid')),
    password1: z.string({ required_error: t('common.validation.required') }).min(8, {
      message: t('pages.auth.registration.form.password1.validation.min', {
        min: 8,
      }),
    }),
    password2: z.string({ required_error: t('common.validation.required') }).min(8, {
      message: t('pages.auth.registration.form.password2.validation.min', {
        min: 8,
      }),
    }),
  })
  .refine(data => data.password1 === data.password2, {
    message: t('pages.auth.registration.form.password2.validation.match'),
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
const [password1, password1Props] = defineField('password1', {
  validateOnBlur: false,
  validateOnModelUpdate: true,
})
const [password2, password2Props] = defineField('password2', {
  validateOnBlur: false,
  validateOnModelUpdate: true,
})

const showPassword1 = ref(false)
const showPassword2 = ref(false)

const handleResendEmail = async (email: string) => {
  try {
    await registrationResendEmail({ email })
    toast.add({
      title: t('pages.auth.registration.account-confirm-email.resend.success.title'),
      color: 'green',
    })
  }
  catch (error) {
    toast.add({
      title: isErrorWithMessage(error) ? error.message : t('pages.auth.registration.account-confirm-email.resend.error.title'),
      color: 'red',
    })
  }
}

const onSubmit = handleSubmit(async (values) => {
  loading.value = true

  try {
    const data = await register({ email: values.email, password1: values.password1, password2: values.password2 })
    toast.add({
      title: data?.detail || t('common.auth.registration.success'),
      color: 'green',
    })
    await fetch()
  }
  catch (error) {
    handleRegistrationError(error, values.email)
  }
  finally {
    loading.value = false
  }
})

function handleRegistrationError(error: any, email: string) {
  const defaultErrorMessage = t('pages.auth.registration.account-confirm-email.resend.error.title')
  if (error?.data?.data) {
    const errorData = error.data.data
    const errorMessages = Object.values(errorData).flat()

    if (errorMessages.length > 0) {
      toast.add({
        title: errorMessages.join('\n'),
        color: 'red',
      })
    }

    if (errorData.error || errorData.email) {
      const actions = [{
        label: t('common.auth.registration.error.action1'),
        click: () => handleResendEmail(email),
      }]
      toast.add({
        description: errorData.error || errorData.email[0],
        color: 'red',
        actions,
      })
    }
  }
  else {
    toast.add({
      title: isErrorWithMessage(error) ? error.message : defaultErrorMessage,
      color: 'red',
    })
  }
}

const submitButtonLabel = computed(() => {
  if (submitCount.value > 5) {
    return t('common.validation.tooManyAttempts')
  }

  return !loading.value
    ? t('pages.auth.registration.form.submit')
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
              $t('pages.auth.registration.form.email.label')
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
              for="password1"
            >{{ $t('pages.auth.registration.form.password1.label') }}</label>
            <div class="relative grid items-center gap-2">
              <FormTextInput
                id="password1"
                v-model="password1"
                :bind="password1Props"
                name="password1"
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
                :aria-label="$t('pages.auth.registration.form.password1.show')"
                @click="showPassword1 = !showPassword1"
              />
            </div>
            <span
              v-if="errors.password1"
              class="relative px-4 py-3 text-xs text-red-600"
            >{{ errors.password1 }}</span>
          </div>

          <div class="grid content-evenly items-start gap-1">
            <label
              class="
                text-primary-950

                dark:text-primary-50
              "
              for="password2"
            >{{ $t('pages.auth.registration.form.password2.label') }}</label>
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
                :aria-label="$t('pages.auth.registration.form.password2.show')"
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
              $t('pages.auth.registration.form.already_have_account')
            }}</span>
            <UButton
              size="lg"
              type="submit"
              color="opposite"
              variant="link"
              :label="$t('pages.auth.login.title')"
              :to="localePath('/auth/login')"
            />
          </div>
        </div>
      </div>
    </form>
  </section>
</template>
