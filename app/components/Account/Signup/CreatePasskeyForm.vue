<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const emit = defineEmits(['getWebAuthnCreateOptionsAtSignup', 'signupWebAuthnCredential'])

const { getWebAuthnCreateOptionsAtSignup, signupWebAuthnCredential } = useAllAuthAuthentication()
const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()
const authInfo = useAuthInfo()
const { $i18n } = useNuxtApp()
const router = useRouter()

const loading = ref(false)
const hasError = ref(false)
const deviceName = ref('')

const schema = z.object({
  name: z.string()
    .min(1, $i18n.t('validation.required'))
    .max(50, $i18n.t('validation.max', { max: 50 })),
})

type Schema = z.output<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>): Promise<void> {
  try {
    loading.value = true
    hasError.value = false

    const optResp = await getWebAuthnCreateOptionsAtSignup()
    const jsonOptions = optResp?.data.request_options.publicKey

    if (!jsonOptions) {
      throw new Error('No creation options')
    }

    const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(jsonOptions)
    const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential

    await signupWebAuthnCredential({
      name: event.data.name,
      credential: credential.toJSON(),
    })

    toast.add({
      title: $i18n.t('success.title'),
      description: t('success.description'),
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })

    emit('getWebAuthnCreateOptionsAtSignup')
    emit('signupWebAuthnCredential')
  }
  catch (error) {
    if (isAllAuthClientError(error)) {
      if (error.data.data.status === 409 || authInfo.pendingFlow?.id !== Flows.MFA_WEBAUTHN_SIGNUP) {
        await router.push(localePath('account-signup-passkey'))
        return
      }
    }
    hasError.value = true
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}
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
      :state="{ name: deviceName }"
      class="space-y-5"
      @submit="onSubmit"
    >
      <UFormField
        name="name"
        :label="t('name_label')"
        :help="t('name_hint')"
        required
      >
        <UInput
          v-model="deviceName"
          :placeholder="t('name_placeholder')"
          icon="i-heroicons-device-phone-mobile"
          :disabled="loading"
          class="w-full"
        />
      </UFormField>

      <UButton
        type="submit"
        :loading="loading"
        :disabled="loading"
        color="neutral"
        variant="subtle"
        block
        size="lg"
        icon="i-heroicons-finger-print"
      >
        {{ $i18n.t('submit') }}
      </UButton>
    </UForm>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-heroicons-light-bulb"
      :description="t('device_hint')"
    />

    <div class="text-center">
      <USeparator :label="t('or')" />

      <div class="mt-4">
        <UButton
          :label="t('using_password')"
          :to="localePath('account-signup')"
          color="neutral"
          variant="link"
        />
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  name_label: Όνομα κλειδιού
  name_hint: Χρησιμοποίησε ένα περιγραφικό όνομα για να αναγνωρίζεις αυτή τη συσκευή
  name_placeholder: π.χ. iPhone μου, Laptop εργασίας
  device_hint: Το όνομα βοηθά στην αναγνώριση αυτής της συσκευής όταν διαχειρίζεσαι τα κλειδιά σου.
  or: ή
  using_password: Εγγραφή με κωδικό
  success:
    description: Το κλειδί πρόσβασης δημιουργήθηκε επιτυχώς.
  error:
    title: Σφάλμα δημιουργίας
    description: Δεν ήταν δυνατή η δημιουργία του κλειδιού. Βεβαιώσου ότι η συσκευή σου υποστηρίζει passkeys.
  validation:
    required: Απαιτείται όνομα
    max: Το όνομα δεν μπορεί να υπερβαίνει τους {max} χαρακτήρες
</i18n>
