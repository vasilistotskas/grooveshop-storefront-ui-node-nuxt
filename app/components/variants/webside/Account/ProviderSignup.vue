<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types'

/**
 * The last step of signing up through a social provider: the email the
 * account will use and the terms, which the shopper accepts here as they
 * do on the email sign-up form, before the account is made.
 */
const { t } = useStoreI18n('components/variants/webside/Account/ProviderSignup')
const localePath = useLocalePath()
const emit = defineEmits(['providerSignup'])

const { schema, state, loading, acceptedTerms, submit } = useProviderSignup({
  success: () => ({ title: t('success.title'), color: 'success' }),
  onSignedUp: () => emit('providerSignup'),
})

const onSubmit = (event: FormSubmitEvent<{ email: string }>) => submit(event.data)
</script>

<template>
  <div
    class="
      container mx-auto p-0
      md:px-6
    "
  >
    <section class="grid items-center">
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @error="scrollToFirstFormError"
        @submit="onSubmit"
      >
        <UFormField
          :label="t('email.title')"
          name="email"
          required
        >
          <UInput
            v-model="state.email"
            type="email"
            autocomplete="email"
            :placeholder="t('email.title')"
            class="w-full"
          />
        </UFormField>

        <UCheckbox
          v-model="acceptedTerms"
          name="terms"
          icon="i-heroicons-check"
          color="info"
          :ui="{
            label: 'text-sm font-medium',
          }"
        >
          <template #label>
            <div class="flex gap-1">
              <span>{{ t('i_approve') }}</span>
              <UButton
                :label="t('terms')"
                :to="localePath('terms-of-use')"
                color="secondary"
                type="button"
                variant="link"
                target="_blank"
                :ui="{
                  base: 'p-0',
                }"
              />
            </div>
          </template>
        </UCheckbox>

        <UButton
          type="submit"
          color="secondary"
          :disabled="!acceptedTerms"
          :loading="loading"
          :label="t('submit')"
        />
      </UForm>
    </section>
  </div>
</template>

<i18n lang="yaml">
el:
  i_approve: Αποδέχομαι τους
  terms: όρους χρήσης
en:
  i_approve: I accept the
  terms: terms of use
</i18n>
