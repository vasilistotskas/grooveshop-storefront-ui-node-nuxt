<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  authenticatorType: { type: String as PropType<AuthenticatorTypeValues>, required: true },
})

defineSlots<{
  default(props: object): any
}>()

const emit = defineEmits(['twoFaAuthenticate'])

const { t } = useI18n()

await usePendingFlowGuard(Flows.MFA_AUTHENTICATE)

const { isRecovery, codeLength, code, recoveryCode, codeString, schema, showError, onSubmit } = useTwoFactorAuthenticate({
  authenticatorType: () => props.authenticatorType,
  recoveryInOneField: true,
  lengthMessage: digits => t('validation.code.length', { n: digits }),
  success: () => ({
    title: t('success.logged_in'),
    description: t('success.description'),
    color: 'success',
    icon: 'i-heroicons-check-circle',
  }),
  onAuthenticated: () => emit('twoFaAuthenticate'),
})
</script>

<template>
  <Account2FaAuthenticateFlow :authenticator-type="authenticatorType">
    <slot />
    <UForm
      :schema="schema"
      :state="{ code: codeString }"
      class="flex flex-col gap-6"
      @error="scrollToFirstFormError"
      @submit="onSubmit"
    >
      <UFormField
        name="code"
        :label="isRecovery ? t('recovery_label') : t('code_label')"
        :ui="isRecovery ? undefined : { label: 'sr-only' }"
      >
        <UInput
          v-if="isRecovery"
          v-model="recoveryCode"
          icon="i-lucide-life-buoy"
          autocomplete="one-time-code"
          inputmode="numeric"
          :maxlength="codeLength"
          class="w-full"
        />
        <UPinInput
          v-else
          v-model="code"
          :length="codeLength"
          type="text"
          otp
          size="xl"
          :aria-label="t('code_label')"
        />
      </UFormField>

      <UAlert
        v-if="showError"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        :title="t('error.title')"
        :description="t('error.invalid_code')"
        close
        @update:open="showError = false"
      />

      <UButton
        :label="t('entry')"
        :disabled="codeString.length !== codeLength"
        size="lg"
        block
        type="submit"
      />
    </UForm>
  </Account2FaAuthenticateFlow>
</template>

<i18n lang="yaml">
el:
  code_label: Κωδικός 6 ψηφίων
  recovery_label: Κωδικός ανάκτησης
  entry: Επαλήθευση
  success:
    logged_in: Συνδέθηκες με επιτυχία
    description: Η ταυτοποίηση ολοκληρώθηκε!
  error:
    invalid_code: Ο κωδικός που εισαγάγατε δεν είναι έγκυρος. Παρακαλώ δοκιμάστε ξανά.
  validation:
    code:
      length: Ο κωδικός πρέπει να έχει {n} ψηφία
en:
  code_label: 6-digit code
  recovery_label: Recovery code
  entry: Verify
  success:
    logged_in: You are signed in
    description: Verification complete.
  error:
    invalid_code: That code is not valid. Please try again.
  validation:
    code:
      length: The code must be {n} digits
</i18n>
