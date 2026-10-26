<script lang="ts" setup>
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
const { t } = useI18n()
const localePath = useLocalePath()

const { schema, passkeyLogin, loading, add } = useAddWebAuthnKey({
  listRoute: { name: 'account-security', hash: '#passkeys' },
  added: () => ({ title: t('added'), color: 'success' }),
  failed: failure => t(`failed.${failure}`),
})

const state = reactive({ name: '', passwordless: false })

const onSubmit = async (event: FormSubmitEvent<typeof state>) => {
  await add(event.data)
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
