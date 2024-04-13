<script lang="ts" setup>
import { z } from 'zod'

const { fetch } = useUserSession()
const { register, registrationResendEmail } = useAuth()

const { t } = useI18n()
const toast = useToast()

const ZodRegistration = z
  .object({
    email: z.string().email(),
    password1: z.string().min(8, {
      message: t('pages.auth.registration.form.password1.validation.min', {
        min: 8,
      }),
    }),
    password2: z.string().min(8, {
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

const { defineField, handleSubmit, errors, isSubmitting } = useForm({
  validationSchema,
})

const [email, emailProps] = defineField('email', {
  validateOnModelUpdate: true,
})
const [password1, password1Props] = defineField('password1', {
  validateOnModelUpdate: true,
})
const [password2, password2Props] = defineField('password2', {
  validateOnModelUpdate: true,
})

const showPassword1 = ref(false)
const showPassword2 = ref(false)

const onSubmit = handleSubmit((values) => {
  register({
    email: values.email,
    password1: values.password1,
    password2: values.password2,
  })
    .then(async (data) => {
      toast.add({
        title: data?.detail || t('common.auth.registration.success'),
        color: 'green',
      })
      await fetch()
    })
    .catch((error) => {
      if (error) {
        const actions = ref([
          {
            label: t('common.auth.registration.error.action1'),
            click: () =>
              email.value
              && registrationResendEmail({
                email: email.value,
              })
                .then(() => {
                  toast.add({
                    title: t(
                      'pages.auth.registration.account-confirm-email.resend.success.title',
                    ),
                    color: 'green',
                  })
                })
                .catch((error) => {
                  if (error) {
                    toast.add({
                      title:
                        error.value?.message
                        ?? t(
                          'pages.auth.registration.account-confirm-email.resend.error.title',
                        ),
                      color: 'red',
                    })
                  }
                }),
          },
        ])
        if (error.data.data?.error) {
          toast.add({
            description: error.data.data?.error,
            color: 'red',
            actions: actions.value,
          })
        }
        else if (error.data.data?.email) {
          toast.add({
            title: error.data.data?.email[0],
            color: 'red',
          })
        }
      }
    })
})
</script>

<template>
  <section class="grid">
    <form
      id="RegistrationForm"
      class="container-3xs !p-0 md:px-6"
      name="RegistrationForm"
      @submit.prevent="onSubmit"
    >
      <div
        class="flex h-full flex-wrap items-center justify-center rounded-[0.5rem] border border-gray-900/10 bg-white p-4 shadow-[0_4px_9px_-4px_#0000000d] dark:border-gray-50/[0.2] dark:bg-zinc-900 dark:shadow-[0_4px_9px_-4px_#0000000d] md:p-8 lg:justify-between"
      >
        <div class="relative grid w-full gap-4">
          <div class="grid content-evenly items-start">
            <label class="text-primary-800 dark:text-primary-100" for="email">{{
              $t('pages.auth.registration.form.email.label')
            }}</label>
            <FormTextInput
              id="email"
              v-model="email"
              :bind="emailProps"
              class="text-primary-800 dark:text-primary-100"
              name="email"
              type="email"
              autocomplete="email"
              :required="true"
            />
            <span
              v-if="errors.email"
              class="relative px-4 py-3 text-sm text-red-600"
            >{{ errors.email }}</span>
          </div>
          <div class="grid content-evenly items-start">
            <label
              class="text-primary-800 dark:text-primary-100"
              for="password1"
            >{{ $t('pages.auth.registration.form.password1.label') }}</label>
            <div class="relative grid items-center gap-2">
              <FormTextInput
                id="password1"
                v-model="password1"
                :bind="password1Props"
                class="text-primary-800 dark:text-primary-100"
                name="password1"
                :type="showPassword1 ? 'text' : 'password'"
                autocomplete="current-password"
                :required="true"
              />
              <button
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 transform"
                :aria-label="$t('pages.auth.registration.form.password1.show')"
                @click="showPassword1 = !showPassword1"
              >
                <IconFa6Solid:eye v-if="!showPassword1" />
                <IconFa6Solid:eyeSlash v-else />
              </button>
            </div>
            <span
              v-if="errors.password1"
              class="relative px-4 py-3 text-sm text-red-600"
            >{{ errors.password1 }}</span>
          </div>

          <div class="grid content-evenly items-start">
            <label
              class="text-primary-800 dark:text-primary-100"
              for="password2"
            >{{ $t('pages.auth.registration.form.password2.label') }}</label>
            <div class="relative grid items-center gap-2">
              <FormTextInput
                id="password2"
                v-model="password2"
                :bind="password2Props"
                class="text-primary-800 dark:text-primary-100"
                name="password2"
                :type="showPassword2 ? 'text' : 'password'"
                autocomplete="current-password"
                :required="true"
              />
              <button
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 transform"
                :aria-label="$t('pages.auth.registration.form.password2.show')"
                @click="showPassword2 = !showPassword2"
              >
                <IconFa6Solid:eye v-if="!showPassword2" />
                <IconFa6Solid:eyeSlash v-else />
              </button>
            </div>
            <span
              v-if="errors.password2"
              class="relative px-4 py-3 text-sm text-red-600"
            >{{ errors.password2 }}</span>
          </div>

          <button
            type="submit"
            class="bg-primary hover:bg-primary-600 focus:bg-primary-600 active:bg-primary-700 inline-block w-full rounded px-7 pb-2.5 pt-3 text-sm font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
            :disabled="isSubmitting"
            :aria-busy="isSubmitting"
          >
            {{ $t('pages.auth.registration.form.submit') }}
          </button>

          <div class="flex items-center justify-end gap-2">
            <span class="text-primary-800 dark:text-primary-100 text-sm">{{
              $t('pages.auth.registration.form.already_have_account')
            }}</span>
            <Anchor
              class="flex items-center self-center text-[1.5rem] text-base hover:text-slate-900 hover:no-underline hover:dark:text-white"
              :title="$t('pages.auth.login.title')"
              :text="$t('pages.auth.login.title')"
              :to="'/auth/login'"
            />
          </div>
        </div>
      </div>
    </form>
  </section>
</template>
