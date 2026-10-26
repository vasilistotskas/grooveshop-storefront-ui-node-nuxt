<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types'

/**
 * The last step of signing up through a social provider: the email the
 * account will use (the provider's, editable) and the terms. No username
 * — the store signs in by email.
 */
const emit = defineEmits(['providerSignup'])

const { t } = useI18n()
const localePath = useLocalePath()

const acceptedTerms = ref(false)

const { schema, state, loading, submit } = useProviderSignup({
  success: () => ({ title: t('success'), color: 'success' }),
  onSignedUp: () => emit('providerSignup'),
})

const onSubmit = (event: FormSubmitEvent<{ email: string }>) => submit(event.data)
</script>

<template>
  <UForm
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

    <UCheckbox
      v-model="acceptedTerms"
      name="terms"
    >
      <template #label>
        {{ t('terms.before') }}<ULink
          :to="localePath('terms-of-use')"
          target="_blank"
          class="font-semibold text-accent"
        >{{ t('terms.terms') }}</ULink>{{ t('terms.after') }}
      </template>
    </UCheckbox>

    <UButton
      :label="t('submit')"
      :disabled="!acceptedTerms"
      :loading="loading"
      size="lg"
      block
      type="submit"
    />
  </UForm>
</template>

<i18n lang="yaml">
el:
  email: Email
  terms:
    before: "Αποδέχομαι τους "
    terms: όρους χρήσης
    after: .
  submit: Ολοκλήρωση εγγραφής
  success: Ο λογαριασμός σου δημιουργήθηκε
en:
  email: Email
  terms:
    before: "I accept the "
    terms: terms of use
    after: .
  submit: Finish sign-up
  success: Your account was created
</i18n>
