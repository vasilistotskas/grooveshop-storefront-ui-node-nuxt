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

const showError = ref(false)
const code = ref<string[]>([])

const codeString = computed(() => code.value.join(''))

const { twoFaAuthenticate } = useAllAuthAuthentication()

if (authInfo?.pendingFlow?.id !== Flows.MFA_AUTHENTICATE) {
  await navigateTo(localePath('index'))
}

const schema = z.object({
  code: z.string()
    .min(1, t('validation.required'))
    .length(codeLength.value, t('validation.code.length')),
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
  </Account2FaAuthenticateFlow>
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
