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

const { codeLength, code, codeString, schema, showError, onSubmit } = useTwoFactorAuthenticate({
  authenticatorType: () => props.authenticatorType,
  recoveryInOneField: false,
  lengthMessage: () => t('validation.code.length'),
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
  <WebsideAccount2FaAuthenticateFlow :authenticator-type="authenticatorType">
    <slot />

    <div class="space-y-6">
      <UAlert
        v-if="showError"
        color="error"
        variant="soft"
        icon="i-heroicons-exclamation-circle"
        :title="t('error.title')"
        :description="t('error.invalid_code')"
        close
        @update:open="showError = false"
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
          <div class="flex justify-center">
            <UPinInput
              v-model="code"
              :length="codeLength"
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
          :disabled="codeString.length !== codeLength"
          block
          size="lg"
          icon="i-heroicons-arrow-right-on-rectangle"
        >
          {{ t('entry') }}
        </UButton>
      </UForm>
    </div>
  </WebsideAccount2FaAuthenticateFlow>
</template>

<i18n lang="yaml">
el:
  code_label: Κωδικός
  code_hint: Εισάγετε τον 6-ψήφιο κωδικό
  success:
    logged_in: Συνδέθηκες με επιτυχία
    description: Η ταυτοποίηση ολοκληρώθηκε!
  error:
    invalid_code: Ο κωδικός που εισαγάγατε δεν είναι έγκυρος. Παρακαλώ δοκιμάστε ξανά.
  validation:
    code:
      length: Ο κωδικός πρέπει να έχει 6 ψηφία
</i18n>
