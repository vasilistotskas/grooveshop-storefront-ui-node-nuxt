<script lang="ts" setup>
import { z } from 'zod'

import { GlobalEvents } from '~/events'

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const localePath = useLocalePath()
const { fetch } = useUserSession()
const { providerSignup } = useAllAuthAuthentication()
const { login } = useAllAuthAuthentication()
const cartStore = useCartStore()
const { refreshCart } = cartStore

const ZodLogin = z.object({
  email: z.string(
    { required_error: t('common.validation.required') },
  ),
  password: z.string({ required_error: t('common.validation.required') }),
})

const validationSchema = toTypedSchema(ZodLogin)

const { defineField, handleSubmit, errors, meta, submitCount } = useForm({
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

const showPassword = ref(false)
const rememberMe = ref(false)
const loading = ref(false)

const bus = useEventBus<string>(GlobalEvents.GENERIC_MODAL)
const onSubmit = handleSubmit(async (values) => {
  try {
    loading.value = true
    await login({
      email: values.email,
      password: values.password,
    })
    await performPostLoginActions()
    await navigateUser()
  }
  catch (error) {
    await handleLoginError(error)
  }
  finally {
    await finalizeLogin()
  }
})

async function performPostLoginActions() {
  await fetch()
  await refreshCart()
}

async function navigateUser() {
  const redirectPath = route.query.redirect?.toString() || '/account'
  await navigateTo(redirectPath)
}

async function handleLoginError(error: any) {
  const errorMessage = error.data?.data?.nonFieldErrors?.[0] || t('common.auth.login.error')
  toast.add({
    title: errorMessage,
    color: 'red',
  })
  await fetch()
}

async function finalizeLogin() {
  loading.value = false
  bus.emit('fallbackModalClose')
}

const submitButtonLabel = computed(() => {
  if (submitCount.value > 5) {
    return t('common.validation.tooManyAttempts')
  }

  return !loading.value
    ? t('pages.account.login.form.submit')
    : t('common.loading')
})
</script>

<template>
  <section class="grid">
    <form
      id="loginForm"
      ref="loginForm"
      class="
        container-3xs

        md:px-6
      "
      name="loginForm"
      @submit="onSubmit"
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
              $t('pages.account.login.form.email.label')
            }}</label>
            <FormTextInput
              id="email"
              v-model="email"
              :bind="emailProps"
              :required="true"
              autocomplete="email"
              name="email"
              type="text"
            />
            <span
              v-if="errors.email && meta.touched"
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
            >{{ $t('pages.account.login.form.password.label') }}</label>
            <div class="relative grid items-center gap-2">
              <FormTextInput
                id="password"
                v-model="password"
                :bind="passwordProps"
                :required="true"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                name="password"
              />
              <UButton
                :aria-label="$t('pages.account.login.form.password.toggle')"
                :icon="
                  showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
                "
                class="absolute right-2 top-1/2 -translate-y-1/2 transform"
                color="primary"
                type="button"
                variant="ghost"
                @click="showPassword = !showPassword"
              />
            </div>
            <span
              v-if="errors.password && meta.touched"
              class="relative px-4 py-3 text-xs text-red-600"
            >{{ errors.password }}</span>
          </div>

          <div
            class="
              flex flex-col justify-between

              sm:flex-row sm:items-center
            "
          >
            <div class="0.125rem] block min-h-[1.5rem] pl-[1.5rem]">
              <input
                id="checkbox"
                v-model="rememberMe"
                class="
                  relative top-[2px] float-left -ml-[1.5rem] mr-[6px]
                  h-[1.125rem] w-[1.125rem] appearance-none rounded-[0.25rem]
                  border-[0.125rem] border-solid border-neutral-300 outline-none

                  before:pointer-events-none before:absolute before:h-[0.875rem]
                  before:w-[0.875rem] before:scale-0 before:rounded-full
                  before:bg-transparent before:opacity-0
                  before:shadow-[0px_0px_0px_13px_transparent]
                  before:content-['']

                  checked:border-primary checked:bg-primary
                  checked:before:opacity-[0.16] checked:after:absolute
                  checked:after:-mt-px checked:after:ml-[0.25rem]
                  checked:after:block checked:after:h-[0.8125rem]
                  checked:after:w-[0.375rem] checked:after:rotate-45
                  checked:after:border-[0.125rem] checked:after:border-l-0
                  checked:after:border-t-0 checked:after:border-solid
                  checked:after:border-white checked:after:bg-transparent
                  checked:after:content-[''] checked:focus:before:scale-100
                  checked:focus:before:shadow-[0px_0px_0px_13px_#3b71ca]
                  checked:focus:before:transition-[box-shadow_0.2s,transform_0.2s]
                  checked:focus:after:-mt-px checked:focus:after:ml-[0.25rem]
                  checked:focus:after:h-[0.8125rem]
                  checked:focus:after:w-[0.375rem] checked:focus:after:rotate-45
                  checked:focus:after:rounded-none
                  checked:focus:after:border-[0.125rem]
                  checked:focus:after:border-l-0 checked:focus:after:border-t-0
                  checked:focus:after:border-solid
                  checked:focus:after:border-white
                  checked:focus:after:bg-transparent

                  dark:checked:border-primary dark:checked:bg-primary
                  dark:border-neutral-600
                  dark:focus:before:shadow-[0px_0px_0px_13px_rgba(255,255,255,0.4)]
                  dark:checked:focus:before:shadow-[0px_0px_0px_13px_#3b71ca]

                  focus:shadow-none focus:transition-[border-color_0.2s]
                  focus:before:scale-100 focus:before:opacity-[0.12]
                  focus:before:shadow-[0px_0px_0px_13px_rgba(0,0,0,0.6)]
                  focus:before:transition-[box-shadow_0.2s,transform_0.2s]
                  focus:after:absolute focus:after:z-[1] focus:after:block
                  focus:after:h-[0.875rem] focus:after:w-[0.875rem]
                  focus:after:rounded-[0.125rem] focus:after:content-['']

                  hover:cursor-pointer hover:before:opacity-[0.04]
                  hover:before:shadow-[0px_0px_0px_13px_rgba(0,0,0,0.6)]
                "
                type="checkbox"
              >
              <label
                class="
                  inline-block pl-[0.15rem] text-sm

                  hover:cursor-pointer
                "
                for="checkbox"
              >
                {{ $t('pages.account.login.form.remember') }}
              </label>
            </div>
            <UButton
              :label="$t('pages.account.login.form.forgot.password.reset')"
              :to="localePath('/account/password/reset')"
              color="opposite"
              size="md"
              type="button"
              variant="link"
            />
          </div>

          <UButton
            :aria-busy="loading"
            :disabled="loading || submitCount > 5"
            :label="
              submitButtonLabel"
            :loading="loading"
            block
            color="primary"
            size="xl"
            type="submit"
            variant="soft"
          />

          <div
            class="
              my-2 flex items-center

              after:mt-0.5 after:flex-1 after:border-t after:border-neutral-300

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
              {{ $t('pages.account.login.form.or') }}
            </p>
          </div>

          <div class="flex items-center justify-center gap-4">
            <UButton
              :aria-busy="loading"
              :aria-label="$t('pages.account.login.form.google')"
              :disabled="loading"
              :loading="loading"
              color="red"
              size="xl"
              type="button"
              variant="solid"
              @click="() => providerSignup({
                email: email,
              })"
            >
              <template #leading>
                <IconMdi:google class="text-xl text-primary-50" />
              </template>
            </UButton>
            <UButton
              :aria-busy="loading"
              :aria-label="$t('pages.account.login.form.facebook')"
              :disabled="loading"
              :loading="loading"
              color="blue"
              size="xl"
              type="button"
              variant="solid"
              @click="() => providerSignup({
                email: email,
              })"
            >
              <template #leading>
                <IconMdi:facebook class="text-xl text-primary-50" />
              </template>
            </UButton>
          </div>

          <div
            class="
              flex flex-col items-center justify-end

              sm:flex-row
            "
          >
            <span
              class="
                text-primary-950 text-sm

                dark:text-primary-50
              "
            >{{
              $t('pages.account.login.form.no.account')
            }}</span>

            <UButton
              :label="$t('common.register')"
              :to="localePath('/account/signup')"
              color="opposite"
              size="md"
              type="button"
              variant="link"
            />
          </div>
        </div>
      </div>
    </form>
  </section>
</template>
