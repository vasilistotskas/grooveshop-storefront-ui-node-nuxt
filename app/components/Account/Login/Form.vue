<script lang="ts" setup>
import * as z from 'zod'

import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'

const config = useRuntimeConfig()
const { t } = useI18n()
const localePath = useLocalePath()
const { login } = useAllAuthAuthentication()
const router = useRouter()
const cartStore = useCartStore()
const { refreshCart } = cartStore
const { isMobileOrTablet } = useDevice()
const { $i18n } = useNuxtApp()

const authStore = useAuthStore()
const { session, status, hasSocialAccountProviders } = storeToRefs(authStore)

const ZodLogin = z.object({
  email: z.email({
    error: issue => issue.input === undefined
      ? $i18n.t('validation.required')
      : $i18n.t('validation.email.valid'),
  }),
  password: z.string({ error: issue => issue.input === undefined
    ? $i18n.t('validation.required')
    : $i18n.t('validation.string.invalid') }),
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
}

const submitButtonLabel = computed(() => {
  if (submitCount.value > 5) {
    return t('validation.too_many_attempts')
  }

  return !loading.value
    ? $i18n.t('submit')
    : $i18n.t('loading')
})

const submitButtonDisabled = computed(() => {
  return loading.value || submitCount.value > 5
})
</script>

<template>
  <section class="relative grid">
    <div
      v-if="isMobileOrTablet"
      class="absolute top-[-1px] z-0 h-64 w-full bg-center"
      :style="isMobileOrTablet ? { backgroundImage: 'url(/img/login-background.png)', backgroundSize: 'cover' } : ''"
    />
    <form
      id="loginForm"
      ref="loginForm"
      class="
        z-10 container mx-auto px-4 !pt-12 !pb-6
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
              grid gap-6 rounded-lg bg-primary-100 px-4 py-8 shadow-lg
              md:bg-transparent md:!p-0 md:shadow-none
              dark:bg-primary-900 dark:md:bg-transparent
            "
          >
            <div class="grid content-evenly items-center justify-center gap-1">
              <NuxtImg
                :style="{ objectFit: 'contain' }"
                :src="'/img/logo-border.png'"
                :width="isMobileOrTablet ? 100 : 140"
                :height="isMobileOrTablet ? 100 : 140"
                :alt="`${'Login Logo ' + config.public.appTitle}`"
                quality="80"
              />
            </div>
            <div class="grid content-evenly items-start gap-1">
              <label
                class="text-xl font-bold"
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
                class="text-xl font-bold"
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
                  color="neutral"
                  type="button"
                  variant="ghost"
                  :ui="{
                    base: 'absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent cursor-pointer',
                  }"
                  @click="showPassword = !showPassword"
                />
              </div>
              <span
                v-if="errors.password && meta.touched"
                class="relative px-4 py-3 text-xs text-red-600"
              >{{ errors.password }}</span>
            </div>
            <UButton
              :aria-busy="loading"
              :disabled="submitButtonDisabled"
              :label="
                submitButtonLabel"
              :loading="loading"
              block
              size="xl"
              type="submit"
              variant="solid"
              color="secondary"
            />
          </div>
          <div
            class="grid gap-4"
          >
            <template v-if="status.config === 'success'">
              <div
                class="
                  flex items-center
                  before:mt-0.5 before:flex-1 before:border-t
                  before:border-neutral-300
                  after:mt-0.5 after:flex-1 after:border-t
                  after:border-neutral-300
                "
              >
                <p
                  class="
                    mx-4 text-center font-semibold text-primary-950
                    dark:text-primary-50
                  "
                >
                  {{ t('or') }}
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
                  class="p-0 font-semibold"
                  color="secondary"
                  size="md"
                  type="button"
                  variant="link"
                />
                <UButton
                  class="p-0 font-semibold"
                  :label="t('forgot.password.reset')"
                  :to="localePath('account-password-reset')"
                  size="md"
                  color="secondary"
                  type="button"
                  variant="link"
                />
                <div
                  class="flex items-center gap-2"
                >
                  <span
                    class="text-sm font-semibold"
                  >{{
                    t('no.account')
                  }}</span>

                  <UButton
                    class="p-0 font-semibold underline"
                    :label="$i18n.t('register')"
                    :to="localePath('account-signup')"
                    size="lg"
                    color="secondary"
                    type="button"
                    variant="link"
                  />
                </div>
              </div>
              <div
                v-if="hasSocialAccountProviders"
                class="grid items-center justify-center gap-4"
              >
                <p
                  class="
                    text-sm font-semibold text-primary-950
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
            <div
              v-else-if="status.config === 'pending'"
              class="grid gap-4"
            >
              <USkeleton
                class="h-6 w-full"
              />
              <USkeleton
                class="h-9 w-full"
              />
              <USkeleton
                class="h-20 w-full"
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
