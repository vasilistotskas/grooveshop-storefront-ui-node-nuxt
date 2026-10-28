<script lang="ts" setup>
const emit = defineEmits(['getWebAuthnCreateOptionsAtSignup', 'signupWebAuthnCredential'])

const { t } = useStoreI18n('components/Account/Signup/CreatePasskeyForm')
const localePath = useLocalePath()

const { schema, deviceName, hasError, isSubmitting, onSubmit } = useCreatePasskeyAtSignup({
  t,
  created: () => ({
    title: t('success.title'),
    description: t('success.description'),
    color: 'success',
    icon: 'i-heroicons-check-circle',
  }),
  onCreated: () => {
    emit('getWebAuthnCreateOptionsAtSignup')
    emit('signupWebAuthnCredential')
  },
})
</script>

<template>
  <UForm
    :schema="schema"
    :state="{ name: deviceName }"
    class="flex flex-col gap-4"
    @error="scrollToFirstFormError"
    @submit="onSubmit"
  >
    <UAlert
      v-if="hasError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      :title="t('error.title')"
      :description="t('error.description')"
      close
      @update:open="hasError = false"
    />

    <UFormField
      name="name"
      :label="t('name_label')"
      :help="t('name_hint')"
      required
    >
      <UInput
        v-model="deviceName"
        :placeholder="t('name_placeholder')"
        icon="i-lucide-smartphone"
        class="w-full"
      />
    </UFormField>

    <UButton
      :label="t('submit')"
      :loading="isSubmitting"
      icon="i-lucide-key-round"
      size="lg"
      block
      type="submit"
    />

    <p class="text-center text-sm text-muted">
      {{ t('prefer_password') }}
      <ULink
        :to="localePath('account-signup')"
        class="font-semibold text-accent"
      >
        {{ t('using_password') }}
      </ULink>
    </p>
  </UForm>
</template>

<i18n lang="yaml">
el:
  name_label: Όνομα κλειδιού
  name_hint: Χρησιμοποίησε ένα περιγραφικό όνομα για να αναγνωρίζεις αυτή τη συσκευή
  name_placeholder: π.χ. iPhone μου, Laptop εργασίας
  submit: Δημιουργία passkey
  prefer_password: Προτιμάς κωδικό;
  using_password: Εγγραφή με email
  success:
    title: Επιτυχία
    description: Το κλειδί πρόσβασης δημιουργήθηκε επιτυχώς.
  error:
    title: Σφάλμα δημιουργίας
    description: Δεν ήταν δυνατή η δημιουργία του κλειδιού. Βεβαιώσου ότι η συσκευή σου υποστηρίζει passkeys.
  validation:
    required: Απαιτείται όνομα
    max: Το όνομα δεν μπορεί να υπερβαίνει τους {max} χαρακτήρες
en:
  name_label: Key name
  name_hint: Use a name that tells you which device this is
  name_placeholder: e.g. My iPhone, Work laptop
  submit: Create passkey
  prefer_password: Prefer a password?
  using_password: Sign up with email
  success:
    title: Done
    description: Your passkey was created.
  error:
    title: The key could not be created
    description: We could not create the key. Check that your device supports passkeys.
  validation:
    required: A name is required
    max: The name cannot be longer than {max} characters
</i18n>
