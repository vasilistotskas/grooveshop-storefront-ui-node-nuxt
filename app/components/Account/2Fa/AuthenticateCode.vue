<script lang="ts" setup>
import type { PropType } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const props = defineProps({
  authenticatorType: { type: String as PropType<AuthenticatorTypeValues>, required: true },
})

// Recovery codes are 8 digits (allauth MFA_RECOVERY_CODE_DIGITS default),
// TOTP codes are 6. Drive the whole input off this so recovery-code login
// isn't stuck behind a 6-slot field it can never fill.
const codeLength = computed(() =>
  props.authenticatorType === AuthenticatorType.RECOVERY_CODES ? 8 : 6,
)

defineSlots<{
  default(props: object): any
}>()

const emit = defineEmits(['twoFaAuthenticate'])

const authInfo = useAuthInfo()
const toast = useToast()
const localePath = useLocalePath()
const authStore = useAuthStore()
const { t } = useI18n()
const { session } = storeToRefs(authStore)

// Race-free reference for tryAdvanceToPendingFlow (see app/utils/auth.ts).
const formPath = useRoute().path

const showError = ref(false)
const code = ref<string[]>([])

// A recovery code is typed into one field, as the board draws it; the
// authenticator's six digits go into the pin boxes.
const isRecovery = computed(() => props.authenticatorType === AuthenticatorType.RECOVERY_CODES)
const recoveryCode = ref('')
const codeString = computed(() => (isRecovery.value ? recoveryCode.value.trim() : code.value.join('')))

const { twoFaAuthenticate } = useAllAuthAuthentication()

if (authInfo?.pendingFlow?.id !== Flows.MFA_AUTHENTICATE) {
  await navigateTo(localePath('index'))
}

const schema = z.object({
  code: z.string()
    .min(1, t('validation.required'))
    .length(codeLength.value, t('validation.code.length', { n: codeLength.value })),
})

type Schema = z.output<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>): Promise<void> {
  try {
    showError.value = false

    const response = await twoFaAuthenticate({
      code: event.data.code,
    })

    session.value = response?.data

    toast.add({
      title: t('success.logged_in'),
      description: t('success.description'),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })

    emit('twoFaAuthenticate')
  }
  catch (error) {
    // Advance if 2FA leads to a further pending step; a wrong code keeps the
    // same mfa_authenticate flow pending (same route), so the guard in
    // tryAdvanceToPendingFlow returns false and the error is shown.
    if (await tryAdvanceToPendingFlow(error, { fromPath: formPath })) return
    showError.value = true
    handleAllAuthClientError(error)
  }
}

// Auto-submit when code is complete
watch(codeString, (newCode) => {
  if (newCode.length === codeLength.value) {
    onSubmit({ data: { code: newCode } } as FormSubmitEvent<Schema>)
  }
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
