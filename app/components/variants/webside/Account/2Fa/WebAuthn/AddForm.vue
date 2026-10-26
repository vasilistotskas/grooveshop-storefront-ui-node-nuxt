<script lang="ts" setup>
const emit = defineEmits(['getWebAuthnCreateOptions', 'addWebAuthnCredential'])

const { t } = useI18n()

const { schema, passkeyLogin, loading, add } = useAddWebAuthnKey({
  listRoute: 'account-2fa-webauthn',
  added: () => ({ title: t('success.title'), color: 'success' }),
  failed: failure => t(`failed.${failure}`),
})

async function onSubmit(values: { name: string, passwordless: boolean }) {
  if (!await add(values)) return
  emit('getWebAuthnCreateOptions')
  emit('addWebAuthnCredential')
}

const formSchema = computed(() => ({
  fields: [
    {
      label: t('name'),
      name: 'name',
      as: 'input',
      rules: schema.shape.name,
      ui: {
        root: 'w-full',
      },
      autocomplete: 'name',
      readonly: false,
      required: true,
      placeholder: t('name_placeholder'),
      type: 'text',
      condition: () => true,
      disabledCondition: () => false,
    },
    {
      label: t('passwordless'),
      name: 'passwordless',
      as: 'checkbox',
      rules: schema.shape.passwordless,
      autocomplete: 'passwordless',
      readonly: false,
      required: false,
      placeholder: t('passwordless'),
      type: 'checkbox',
      initialValue: false,
      condition: () => passkeyLogin.value,
      disabledCondition: () => false,
    },
  ],
} as const satisfies DynamicFormSchema))
</script>

<template>
  <section
    class="
      grid gap-4
      lg:flex
    "
  >
    <slot />
    <div class="w-full space-y-6">
      <UCard>
        <UAlert
          color="info"
          variant="soft"
          icon="i-heroicons-information-circle"
          :title="t('alert.title')"
          :description="t('alert.description')"
        />

        <div class="space-y-4 pt-4 pb-4">
          <div>
            <h3 class="mb-2 text-lg font-semibold">
              {{ t('add_key_title') }}
            </h3>
            <p class="text-sm text-muted">
              {{ t('add_key_description') }}
            </p>
          </div>

          <UAlert
            color="info"
            variant="soft"
            icon="i-heroicons-light-bulb"
          >
            <template #title>
              {{ t('tip.title') }}
            </template>
            <template #description>
              <ul class="mt-2 list-inside list-disc space-y-1 text-sm">
                <li>{{ t('tip.browser') }}</li>
                <li>{{ t('tip.device') }}</li>
                <li>{{ t('tip.passwordless') }}</li>
              </ul>
            </template>
          </UAlert>
        </div>

        <DynamicForm
          class="!flex flex-col"
          :button-label="t('submit')"
          :schema="formSchema"
          :loading="loading"
          @submit="onSubmit"
        />
      </UCard>
    </div>
  </section>
</template>

<i18n lang="yaml">
el:
  name_placeholder: π.χ. "YubiKey μου" ή "Τηλέφωνο εργασίας"
  add_key_title: Προσθήκη νέου κλειδιού ασφαλείας
  add_key_description: Δώσε ένα περιγραφικό όνομα στο κλειδί σου για να το αναγνωρίζεις εύκολα.
  passwordless: Χωρίς κωδικό
  alert:
    title: Τι είναι το WebAuthn;
    description: Το WebAuthn σου επιτρέπει να χρησιμοποιήσεις κλειδιά ασφαλείας (όπως YubiKey) ή βιομετρικά στοιχεία (όπως αναγνώριση προσώπου ή δακτυλικών αποτυπωμάτων) για ασφαλή σύνδεση στον λογαριασμό σου.
  tip:
    title: Συμβουλές
    browser: Βεβαιώσου ότι το πρόγραμμα περιήγησής σου υποστηρίζει WebAuthn
    device: Έχεις έτοιμο το κλειδί ασφαλείας ή τη συσκευή σου
    passwordless: Η επιλογή "Χωρίς κωδικό" σου επιτρέπει να συνδεθείς χωρίς κωδικό πρόσβασης
  failed:
    cancelled: Η προσθήκη ακυρώθηκε ή έληξε ο χρόνος. Δοκίμασε ξανά.
    registered: Αυτό το κλειδί είναι ήδη καταχωρημένο στον λογαριασμό σου.
    other: Το κλειδί δεν προστέθηκε. Δοκίμασε ξανά.
en:
  name_placeholder: e.g. "My YubiKey" or "Work phone"
  add_key_title: Add a new security key
  add_key_description: Give your key a name that tells you which one it is.
  passwordless: Passwordless
  alert:
    title: What is WebAuthn?
    description: WebAuthn lets you sign in with a security key (a YubiKey, say) or with biometrics such as your face or fingerprint.
  tip:
    title: Tips
    browser: Check that your browser supports WebAuthn
    device: Have your security key or device to hand
    passwordless: Choosing passwordless lets you sign in without a password at all
  failed:
    cancelled: Adding the key was cancelled or timed out. Please try again.
    registered: That key is already registered on your account.
    other: The key was not added. Please try again.
</i18n>
