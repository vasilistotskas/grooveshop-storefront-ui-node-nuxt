<script lang="ts" setup>
const emit = defineEmits(['confirmLoginCode'])

const { t } = useStoreI18n('components/variants/webside/Account/Login/Code/ConfirmForm')
const localePath = useLocalePath()

const { code, codeString, hasError, schema, onSubmit } = useLoginCodeConfirm({
  welcome: () => ({
    title: t('logged_in'),
    description: t('welcome_back'),
    color: 'success',
    icon: 'i-heroicons-check-circle',
  }),
  onConfirmed: () => emit('confirmLoginCode'),
})
</script>

<template>
  <div class="space-y-6">
    <UAlert
      v-if="hasError"
      color="error"
      variant="soft"
      icon="i-heroicons-exclamation-circle"
      :title="t('error.title')"
      :description="t('error.description')"
      close
      @update:open="hasError = false"
    />

    <UForm
      :schema="schema"
      :state="{ code: codeString }"
      class="space-y-6"
      @error="scrollToFirstFormError"
      @submit="onSubmit"
    >
      <UFormField
        name="code"
        :label="t('code_label')"
      >
        <div class="flex justify-center pt-2">
          <UPinInput
            v-model="code"
            :length="6"
            type="text"
            otp
            size="xl"
            placeholder="○"
            class="gap-2"
          />
        </div>

        <template #hint>
          <div class="mt-2 text-center text-sm text-muted">
            {{ t('code_hint') }}
          </div>
        </template>
      </UFormField>

      <UButton
        type="submit"
        :disabled="codeString.length !== 6"
        block
        color="neutral"
        variant="subtle"
        size="lg"
        icon="i-heroicons-arrow-right-on-rectangle"
      >
        {{ t('submit') }}
      </UButton>
    </UForm>

    <div class="text-center">
      <USeparator :label="t('separator')" />

      <div class="mt-4 text-sm text-muted">
        {{ t('no_code') }}
        <UButton
          variant="link"
          :to="localePath('account-login-code')"
          class="p-0 font-medium"
        >
          {{ t('resend') }}
        </UButton>
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  code_label: Κωδικός επιβεβαίωσης
  code_hint: Εισάγετε τον 6-ψήφιο κωδικό από το email σας
  submit: Σύνδεση
  logged_in: Συνδεθήκατε επιτυχώς
  welcome_back: Καλώς ήρθατε πίσω!
  error:
    title: Μη έγκυρος κωδικός
    description: Ο κωδικός που εισαγάγατε δεν είναι έγκυρος ή έχει λήξει.
  separator: ή
  no_code: Δεν λάβατε κωδικό;
  resend: Αποστολή ξανά
  validation:
    required: Απαιτείται κωδικός
    code:
      length: Ο κωδικός πρέπει να έχει 6 ψηφία
</i18n>
