<script lang="ts" setup>
import * as z from 'zod'

import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { GlobalEvents } from '~/events'

const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()
const { login } = useAllAuthAuthentication()
const cartStore = useCartStore()
const { refreshCart } = cartStore

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
              t('email.label')
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
            >{{ t('password.label') }}</label>
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
                :aria-label="t('password.toggle')"
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
              :label="t('use.code')"
              :to="localePath('/account/login/code')"
              color="opposite"
              size="md"
              type="button"
              variant="link"
            />
            <UButton
              :label="t('forgot.password.reset')"
              :to="localePath('/account/password/reset')"
              color="opposite"
              size="md"
              type="button"
              variant="link"
            />
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
                class="
                  mx-4 text-center font-semibold

                  dark:text-neutral-200
                "
              >
                {{ $t('or.title') }}
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
              height="36px"
              width="100%"
            />
            <ClientOnlyFallback
              height="80px"
              width="100%"
            />
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
              t('no.account')
            }}</span>

            <UButton
              :label="$t('register')"
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
