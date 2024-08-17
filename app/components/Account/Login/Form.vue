<script lang="ts" setup>
import { z } from 'zod'

import { GlobalEvents } from '~/events'

const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()
const { clear } = useUserSession()
const { login } = useAllAuthAuthentication()
const cartStore = useCartStore()
const { refreshCart } = cartStore

const authStore = useAuthStore()
const { session, hasProviders } = storeToRefs(authStore)

const ZodLogin = z.object({
  email: z.string({ required_error: t('common.validation.required') }).email(t('common.validation.email.valid')),
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
const loading = ref(false)
const turnstile = ref()
const token = ref('')

const bus = useEventBus<string>(GlobalEvents.GENERIC_MODAL)
const onSubmit = handleSubmit(async (values) => {
  try {
    loading.value = true
    await clear()
    session.value = await login({
      email: values.email,
      password: values.password,
    })
    await performPostLoginActions()
  }
  catch (error) {
    await handleLoginError(error)
  }
  finally {
    await finalizeLogin()
  }
})

async function performPostLoginActions() {
  await refreshCart()
}

async function handleLoginError(error: any) {
  const pendingFlow = pendingFlowInError(error)
  if (pendingFlow && pendingFlow.id === 'mfa_authenticate') {
    toast.add({
      title: t('common.auth.pending.mfa_authenticate'),
      color: 'blue',
    })
    return
  }
  if (isAllAuthClientError(error)) {
    const errors = 'errors' in error.data.data ? error.data.data.errors : []
    errors.forEach((error) => {
      toast.add({
        title: error.message,
        color: 'red',
      })
    })
    return
  }
  toast.add({
    title: t('common.auth.login.error'),
    color: 'red',
  })
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

const isDev = computed(() => import.meta.dev)

const submitButtonDisabled = computed(() => {
  if (!isDev.value) {
    if (!token.value) {
      return true
    }
  }
  return loading.value || submitCount.value > 5
})

onReactivated(() => {
  if (!isDev.value) {
    token.value = ''
    turnstile.value?.reset()
  }
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
            <UButton
              :label="$t('pages.account.login.form.use.code')"
              :to="localePath('/account/login/code')"
              color="opposite"
              size="md"
              type="button"
              variant="link"
            />
            <UButton
              :label="$t('pages.account.login.form.forgot.password.reset')"
              :to="localePath('/account/password/reset')"
              color="opposite"
              size="md"
              type="button"
              variant="link"
            />
          </div>

          <FormTurnstileContainer v-if="!isDev">
            <NuxtTurnstile
              :key="$colorMode.value"
              ref="turnstile"
              v-model="token"
              :options="{ theme: $colorMode.value === 'light' ? 'light' : 'dark' }"
              class="turnstile"
            />
          </FormTurnstileContainer>

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

          <div v-if="hasProviders" class="grid gap-4">
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
            <WebAuthnLoginButton />
            <div class="grid items-center justify-center gap-4">
              <p
                class="
                  text-primary-950

                  dark:text-primary-50
                "
              >
                {{ $t('pages.account.login.form.social.title') }}
              </p>
              <div class="flex items-center justify-center gap-4">
                <AccountProviderList />
              </div>
            </div>
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
