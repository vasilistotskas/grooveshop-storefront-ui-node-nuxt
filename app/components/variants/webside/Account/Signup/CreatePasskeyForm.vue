<script lang="ts" setup>
const emit = defineEmits(['getWebAuthnCreateOptionsAtSignup', 'signupWebAuthnCredential'])

const { t } = useI18n()
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
      @error="scrollToFirstFormError"
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
          class="w-full"
        />
      </UFormField>

      <UButton
        type="submit"
        color="neutral"
        variant="subtle"
        :loading="isSubmitting"
        block
        size="lg"
        icon="i-heroicons-finger-print"
      >
        {{ t('submit') }}
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
    title: Επιτυχία
    description: Το κλειδί πρόσβασης δημιουργήθηκε επιτυχώς.
  error:
    title: Σφάλμα δημιουργίας
    description: Δεν ήταν δυνατή η δημιουργία του κλειδιού. Βεβαιώσου ότι η συσκευή σου υποστηρίζει passkeys.
  validation:
    required: Απαιτείται όνομα
    max: Το όνομα δεν μπορεί να υπερβαίνει τους {max} χαρακτήρες
</i18n>
