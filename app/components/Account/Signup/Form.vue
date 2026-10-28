<script lang="ts" setup>
import * as z from 'zod'

/**
 * Making an account, in the board's order: a passkey, then email and
 * one password (the meter under it says how strong), the terms, the
 * newsletter opt-in, then the store's social providers.
 *
 * One password field, not two: the field reveals what was typed, and a
 * second box only doubled the chance of a typo the first one would have
 * shown. The newsletter box is offered when the store can honour it
 * (`useNewsletterAvailability`); its label is the store's consent sentence,
 * which is what Django stores as the proof, and the subscription is
 * requested once the account exists — a failure there never undoes the
 * account.
 */
const authStore = useAuthStore()
const { config, status } = storeToRefs(authStore)
const { hasProviders } = useSocialProviders()

const { t } = useStoreI18n('components/Account/Signup/Form')
const toast = useToast()
const localePath = useLocalePath()

const newsletter = await useNewsletterAvailability()

const acceptedTerms = ref(false)
const wantsNewsletter = ref(false)

async function subscribeIfAsked(email: string) {
  if (!wantsNewsletter.value || !newsletter.available.value) return
  try {
    await requestNewsletterSubscription({ email, consent: true })
  }
  catch {
    toast.add({ title: t('newsletter_failed'), color: 'warning' })
  }
}

const { email, password, isSubmitting, signup } = useSignup({
  messages: {
    email: () => t('validation.email.valid'),
    minimum: min => t('validation.min', { min }),
  },
  onCreated: subscribeIfAsked,
})

const schema = z.object({ email, password })

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: undefined,
  password: undefined,
})

const onSubmit = (event: { data: Schema }) => signup(event.data)
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- allauth signs up by passkey only where passkeys are a supported second factor. -->
    <template v-if="config?.mfa?.supported_types.includes('webauthn')">
      <UButton
        :label="t('passkey')"
        :to="localePath('account-signup-passkey')"
        icon="i-lucide-key-round"
        color="neutral"
        variant="outline"
        size="lg"
        block
      />
      <USeparator :label="t('or_email')" />
    </template>
    <USkeleton
      v-else-if="status.config === 'pending'"
      class="h-13 w-full rounded-full"
    />

    <UForm
      id="SignupForm"
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
        <FormPasswordInput
          v-model="state.password"
          autocomplete="new-password"
        />
        <FormPasswordStrengthMeter :password="state.password ?? ''" />
      </UFormField>

      <UCheckbox
        v-model="acceptedTerms"
        name="terms"
      >
        <template #label>
          {{ t('terms.before') }}<ULink
            :to="localePath('terms-of-use')"
            target="_blank"
            class="font-semibold text-accent"
          >{{ t('terms.terms') }}</ULink>{{ t('terms.middle') }}<ULink
            :to="localePath('privacy-policy')"
            target="_blank"
            class="font-semibold text-accent"
          >{{ t('terms.privacy') }}</ULink>{{ t('terms.after') }}
        </template>
      </UCheckbox>

      <UCheckbox
        v-if="newsletter.available.value"
        v-model="wantsNewsletter"
        name="newsletter"
      >
        <template #label>
          {{ newsletter.consent.value.before }}<ULink
            :to="localePath('privacy-policy')"
            target="_blank"
            class="font-semibold text-accent"
          >{{ newsletter.consent.value.privacy }}</ULink>{{ newsletter.consent.value.after }}
          <span class="text-muted">{{ t('optional') }}</span>
        </template>
      </UCheckbox>

      <UButton
        :label="t('submit')"
        :disabled="!acceptedTerms"
        :loading="isSubmitting"
        size="lg"
        block
        type="submit"
      />
    </UForm>

    <template v-if="hasProviders">
      <USeparator :label="t('or')" />
      <AccountProviderList />
    </template>

    <p class="text-center text-sm text-muted">
      {{ t('have_account') }}
      <ULink
        :to="localePath('account-login')"
        class="font-semibold text-accent"
      >
        {{ t('login') }}
      </ULink>
    </p>
  </div>
</template>

<i18n lang="yaml">
el:
  passkey: Εγγραφή με passkey
  or_email: ή με email
  or: ή
  email: Email
  password: Κωδικός
  terms:
    before: "Αποδέχομαι τους "
    terms: όρους χρήσης
    middle: " και την "
    privacy: πολιτική απορρήτου
    after: .
  optional: Προαιρετικό.
  submit: Δημιουργία λογαριασμού
  have_account: Έχεις ήδη λογαριασμό;
  login: Σύνδεση
  newsletter_failed: Ο λογαριασμός σου είναι έτοιμος, αλλά η εγγραφή στο email δεν ολοκληρώθηκε. Μπορείς να εγγραφείς από τον λογαριασμό σου.
en:
  passkey: Sign up with a passkey
  or_email: or with email
  or: or
  email: Email
  password: Password
  terms:
    before: "I accept the "
    terms: terms of use
    middle: " and the "
    privacy: privacy policy
    after: .
  optional: Optional.
  submit: Create account
  have_account: Already have an account?
  login: Sign in
  newsletter_failed: Your account is ready, but the email sign-up did not go through. You can subscribe from your account.
</i18n>
