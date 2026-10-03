<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * Signing in, every way the store offers, in the board's order: a
 * passkey, then email and password (with the one-time code beside it),
 * then the store's social providers, then the way to an account.
 *
 * Rendered by the sign-in page under its heading, and by the sign-in
 * dialog the blog opens — so it carries no heading or logo of its own.
 */
const { t } = useI18n()
const localePath = useLocalePath()
const { login } = useAllAuthAuthentication()
const router = useRouter()
const cartStore = useCartStore()
const { refreshCart } = cartStore

const authStore = useAuthStore()
const { config, session, status } = storeToRefs(authStore)
const { hasProviders } = useSocialProviders()

// Captured at setup — the race-free reference point for
// tryAdvanceToPendingFlow (the auth:change hook may navigate before our
// catch runs, so the live route is not trustworthy there).
const formPath = router.currentRoute.value.path

const isSubmitting = ref(false)

const schema = z.object({
  email: z.email({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.email.valid'),
  }),
  password: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') }).min(1, {
    error: t('validation.required'),
  }),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: undefined,
  password: undefined,
})

/**
 * The one login path.
 *
 * Exposed so a caller can drive it with credentials it already has —
 * the demo-account strip on the sign-in page — without a second copy of
 * the pending-flow handling, the cart refresh and the `next` bookkeeping.
 */
const performLogin = async (email: string, password: string) => {
  isSubmitting.value = true
  try {
    const currentPath = router.currentRoute.value.path
    const currentQuery = router.currentRoute.value.query

    if (!currentQuery.next) {
      await router.replace({ query: { next: currentPath } })
    }

    const response = await login({ email, password })

    session.value = response?.data
  }
  catch (error) {
    // A correct password on a 2FA-enabled account does not sign the user in
    // outright — allauth replies 401 with `mfa_authenticate` pending. That is
    // not a login failure: route to the second-factor challenge instead of
    // leaving the form silent.
    if (await tryAdvanceToPendingFlow(error, { fromPath: formPath })) return
    handleAllAuthClientError(error)
  }
  finally {
    await refreshCart()
    isSubmitting.value = false
  }
}

const onSubmit = async (event: FormSubmitEvent<Schema>) =>
  performLogin(event.data.email, event.data.password)

defineExpose({ performLogin, isSubmitting })
</script>

<template>
  <div class="flex flex-col gap-6">
    <template v-if="config?.mfa?.passkey_login_enabled">
      <WebAuthnLoginButton />
      <USeparator :label="t('or_email')" />
    </template>
    <USkeleton
      v-else-if="status.config === 'pending'"
      class="h-13 w-full rounded-full"
    />

    <UForm
      id="loginForm"
      :schema="schema"
      :state="state"
      class="flex flex-col gap-4"
      @error="scrollToFirstFormError"
      @submit="onSubmit"
    >
      <UFormField
        :label="t('email')"
        name="email"
        required
      >
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="email"
          inputmode="email"
          icon="i-lucide-mail"
          class="w-full"
        />
      </UFormField>

      <UFormField
        :label="t('password')"
        name="password"
        required
      >
        <template #hint>
          <ULink
            :to="localePath('account-password-reset')"
            class="text-[0.8125rem] font-semibold text-accent"
          >
            {{ t('forgot') }}
          </ULink>
        </template>
        <FormPasswordInput
          v-model="state.password"
          autocomplete="current-password"
        />
      </UFormField>

      <UButton
        :label="t('submit')"
        :loading="isSubmitting"
        size="lg"
        block
        type="submit"
      />
      <UButton
        :label="t('use_code')"
        :to="localePath('account-login-code')"
        icon="i-lucide-mail"
        color="neutral"
        variant="ghost"
        block
      />
    </UForm>

    <template v-if="hasProviders">
      <USeparator :label="t('or')" />
      <AccountProviderList />
    </template>

    <p class="text-center text-sm text-muted">
      {{ t('new_here') }}
      <ULink
        :to="localePath('account-signup')"
        class="font-semibold text-accent"
      >
        {{ t('create_account') }}
      </ULink>
    </p>
  </div>
</template>

<i18n lang="yaml">
el:
  or_email: ή με email
  or: ή
  email: Email
  password: Κωδικός
  forgot: Ξέχασες τον κωδικό;
  submit: Σύνδεση
  use_code: Στείλε μου κωδικό σύνδεσης στο email
  new_here: Πρώτη φορά εδώ;
  create_account: Δημιούργησε λογαριασμό
en:
  or_email: or with email
  or: or
  email: Email
  password: Password
  forgot: Forgot password?
  submit: Sign in
  use_code: Email me a sign-in code instead
  new_here: New here?
  create_account: Create an account
</i18n>
