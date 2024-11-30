<script lang="ts" setup>
import * as z from 'zod'

import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { GlobalEvents } from '~/events'

const config = useRuntimeConfig()
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()
const { login } = useAllAuthAuthentication()
const router = useRouter()
const cartStore = useCartStore()
const { refreshCart } = cartStore
const { isMobileOrTablet } = useDevice()

const authStore = useAuthStore()
const { session, status, hasSocialaccountProviders } = storeToRefs(authStore)

const ZodLogin = z.object({
  email: z.string({ required_error: t('validation.required') }).email(t('validation.email.valid')),
  password: z.string({ required_error: t('validation.required') }),
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

const bus = useEventBus<string>(GlobalEvents.GENERIC_MODAL)
const onSubmit = handleSubmit(async (values) => {
  try {
    loading.value = true
    const currentPath = router.currentRoute.value.path
    const currentQuery = router.currentRoute.value.query

    if (!currentQuery.next) {
      await router.replace({ query: { next: currentPath } })
    }

    const response = await login({
      email: values.email,
      password: values.password,
    })

    session.value = response?.data

    await performPostLoginActions()
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    await finalizeLogin()
  }
})

async function performPostLoginActions() {
  await refreshCart()
}

async function finalizeLogin() {
  loading.value = false
  bus.emit('fallbackModalClose')
}

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
      v-if="isMobileOrTablet"
      class="
        top-[-1px] h-64 absolute z-0 w-full bg-center
      "
      :style="isMobileOrTablet ? { backgroundImage: 'url(/img/login-background.png)', backgroundSize: 'cover' } : ''"
    />
    <form
      id="loginForm"
      ref="loginForm"
      class="
        z-10 !pt-12 container-3xs px-8 !pb-6

        md:!p-0
      "
      name="loginForm"
      @submit="onSubmit"
    >
      <div
        class="h-full flex-wrap items-center justify-center rounded-lg p-0"
      >
        <div class="relative grid w-full gap-4">
          <div
            class="
              grid gap-6 p-8 shadow-lg bg-primary-100 rounded-lg

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
                  text-xl font-bold text-secondary

                  dark:text-secondary-dark
                "
                for="password"
              >{{ t('password.label') }}</label>
              <div class="relative grid items-center gap-2">
                <FormTextInput
                  id="password"
                  v-model="password"
                  :bind="passwordProps"
                  :required="true"
                  :size="'lg'"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  name="password"
                />
                <UButton
                  :aria-label="t('password.toggle')"
                  :icon="
                    showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
                  "
                  class="absolute right-2 top-1/2 -translate-y-1/2"
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
          <div
            class="grid gap-4"
          >
            <template v-if="status.config === 'success'">
              <div
                class="
                  flex items-center

                  after:mt-0.5 after:flex-1 after:border-t
                  after:border-neutral-300

                  before:mt-0.5 before:flex-1 before:border-t
                  before:border-neutral-300
                "
              >
                <p
                  class="
                    mx-4 text-center font-semibold text-primary-950

                    dark:text-primary-50
                  "
                >
                  {{ $t('or.title') }}
                </p>
              </div>
              <WebAuthnLoginButton />
              <div
                class="
                flex flex-col items-center gap-2 py-4

                sm:flex-col
              "
              >
                <UButton
                  :label="t('use.code')"
                  :to="localePath('account-login-code')"
                  class="
                  p-0 text-secondary font-semibold

                  dark:text-secondary-dark
                "
                  color="opposite"
                  size="md"
                  type="button"
                  variant="link"
                />
                <UButton
                  class="
                  p-0 text-secondary font-semibold

                  dark:text-secondary-dark
                "
                  :label="t('forgot.password.reset')"
                  :to="localePath('account-password-reset')"
                  size="md"
                  color="opposite"
                  type="button"
                  variant="link"
                />
                <div
                  class="flex items-center gap-2"
                >
                  <span
                    class="
                    text-secondary text-sm font-semibold

                    dark:text-secondary-dark
                  "
                  >{{
                    t('no.account')
                  }}</span>

                  <UButton
                    class="
                    p-0 text-secondary font-semibold underline

                    dark:text-secondary-dark
                  "
                    :label="$t('register')"
                    :to="localePath('account-signup')"
                    size="lg"
                    color="opposite"
                    type="button"
                    variant="link"
                  />
                </div>
              </div>
              <div
                v-if="hasSocialaccountProviders"
                class="
                  grid items-center justify-center gap-4
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
            </template>
            <div v-else-if="status.config === 'pending'" class="grid gap-4">
              <ClientOnlyFallback
                height="24px"
                width="100%"
              />
              <ClientOnlyFallback
                height="36px"
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
  social:
    title: Ή συνδέσου μέσω ενός τρίτου παρόχου
  email:
    label: Email
    validation:
      email: Το email πρέπει να είναι έγκυρη διεύθυνση email
  password:
    label: Κωδικός πρόσβασης
    toggle: Δείξε τον κωδικό
  use:
    code: Σύνδεση με κωδικό μιας χρήσης
  forgot:
    password:
      reset: Ξέχασες τον κωδικό σου;
  submit: Σύνδεση
  or: ή
  no:
    account: Δεν έχεις λογαριασμό;
</i18n>
