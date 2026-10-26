<script lang="ts" setup>
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

const authStore = useAuthStore()
const { config, status } = storeToRefs(authStore)
const { hasProviders } = useSocialProviders()

const { schema, state, isSubmitting, performLogin, onSubmit } = useLogin()

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
