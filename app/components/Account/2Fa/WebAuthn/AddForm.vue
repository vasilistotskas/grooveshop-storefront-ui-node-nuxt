<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * Add a passkey or a security key: allauth's creation options go to the
 * browser, the credential comes back under the name given. A key made to
 * sign in on its own (a passkey, allauth's `passwordless`) is offered
 * only where the store lets passkeys sign in.
 *
 * When the key is the account's first second factor allauth also makes
 * recovery codes, and the shopper is sent to see them; otherwise back to
 * the passkeys on the Security page. A failure says which it was in the
 * shopper's language — allauth's refusals by their codes, the browser's
 * by the two it names (cancelled or timed out; a key already here) —
 * never the browser's English message.
 */
const { getWebAuthnCreateOptions, addWebAuthnCredential } = useAllAuthAccount()
const { config } = storeToRefs(useAuthStore())

const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()

const passkeyLogin = computed(() => config.value?.mfa?.passkey_login_enabled ?? false)

function failureOf(error: unknown): 'cancelled' | 'registered' | 'other' {
  if (error instanceof DOMException && error.name === 'NotAllowedError') return 'cancelled'
  if (error instanceof DOMException && error.name === 'InvalidStateError') return 'registered'
  return 'other'
}

const schema = z.object({
  name: z.string().trim().min(1, t('validation.required')).max(255, t('validation.max', { max: 255 })),
  passwordless: z.boolean(),
})
type Schema = z.output<typeof schema>

const state = reactive<Schema>({ name: '', passwordless: false })
const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    const options = await getWebAuthnCreateOptions(event.data.passwordless)
    const json = options?.data.creation_options.publicKey
    if (!json) throw new Error('allauth sent no creation options')
    const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(json)
    const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential
    const response = await addWebAuthnCredential({ name: event.data.name, credential: credential.toJSON() })
    toast.add({ title: t('added'), color: 'success' })
    await navigateTo(response?.meta.recovery_codes_generated
      ? localePath('account-2fa-recovery-codes')
      : localePath({ name: 'account-security', hash: '#passkeys' }))
  }
  catch (error) {
    if (isAllAuthClientError(error)) return handleAllAuthClientError(error)
    log.error({ action: 'webauthn:add', error })
    toast.add({ title: t(`failed.${failureOf(error)}`), color: 'error' })
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="flex max-w-md flex-col gap-4"
    @submit="onSubmit"
  >
    <UFormField
      :label="t('name')"
      :description="t('name_help')"
      name="name"
      required
    >
      <UInput
        v-model="state.name"
        :placeholder="t('name_placeholder')"
        autocomplete="off"
        class="w-full"
      />
    </UFormField>

    <UFormField
      v-if="passkeyLogin"
      name="passwordless"
    >
      <USwitch
        v-model="state.passwordless"
        :label="t('passwordless')"
        :description="t('passwordless_help')"
      />
    </UFormField>

    <div class="flex flex-wrap items-center gap-2 pt-2">
      <UButton
        :label="t('submit')"
        :loading="loading"
        type="submit"
        color="neutral"
      />
      <UButton
        :label="t('cancel')"
        :to="localePath({ name: 'account-security', hash: '#passkeys' })"
        color="neutral"
        variant="ghost"
      />
    </div>
  </UForm>
</template>

<i18n lang="yaml">
el:
  name: Όνομα
  name_help: Για να το ξεχωρίζεις από τα υπόλοιπα κλειδιά σου.
  name_placeholder: π.χ. iPhone ή YubiKey
  passwordless: Σύνδεση χωρίς κωδικό
  passwordless_help: Συνδέσου μόνο με αυτό το κλειδί, με το πρόσωπο, το δακτυλικό αποτύπωμα ή το PIN της συσκευής σου.
  submit: Προσθήκη κλειδιού
  cancel: Άκυρο
  added: Το κλειδί προστέθηκε
  failed:
    cancelled: Η προσθήκη ακυρώθηκε ή έληξε ο χρόνος. Δοκίμασε ξανά.
    registered: Αυτό το κλειδί είναι ήδη καταχωρημένο στον λογαριασμό σου.
    other: Το κλειδί δεν προστέθηκε. Δοκίμασε ξανά.
en:
  name: Name
  name_help: So you can tell it from your other keys.
  name_placeholder: e.g. iPhone or YubiKey
  passwordless: Sign in without a password
  passwordless_help: Sign in with this key alone, using your face, fingerprint or device PIN.
  submit: Add key
  cancel: Cancel
  added: Key added
  failed:
    cancelled: Adding the key was cancelled or timed out. Please try again.
    registered: That key is already registered on your account.
    other: The key was not added. Please try again.
</i18n>
