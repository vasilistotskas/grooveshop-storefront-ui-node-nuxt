<script lang="ts" setup>
import type { PropType } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

defineProps({
  authenticatorType: { type: String as PropType<AuthenticatorTypeValues>, required: true },
})

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
const { $i18n } = useNuxtApp()

const loading = ref(false)
const showError = ref(false)
const code = ref<string[]>([])

const codeString = computed(() => code.value.join(''))

const { twoFaAuthenticate } = useAllAuthAuthentication()

if (authInfo?.pendingFlow?.id !== Flows.MFA_AUTHENTICATE) {
  await navigateTo(localePath('index'))
}

const schema = z.object({
  code: z.string()
    .min(1, $i18n.t('validation.required'))
    .length(6, t('validation.code.length')),
})

type Schema = z.output<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>): Promise<void> {
  try {
    loading.value = true
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
  finally {
    loading.value = false
  }
}

// Auto-submit when code is complete
watch(codeString, (newCode) => {
  if (newCode.length === 6) {
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
        :title="$i18n.t('error.title')"
        :description="$i18n.t('error.invalid_code')"
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
              :length="6"
              type="text"
              otp
              size="xl"
              placeholder="○"
              :disabled="loading"
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
          :loading="loading"
          :disabled="codeString.length !== 6"
          block
          size="lg"
          icon="i-heroicons-arrow-right-on-rectangle"
        >
          {{ $i18n.t('entry') }}
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
