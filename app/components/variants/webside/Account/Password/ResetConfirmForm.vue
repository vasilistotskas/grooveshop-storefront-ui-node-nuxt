<script lang="ts" setup>
const { t } = useI18n()

const { key, hasError, isSubmitting, newPassword1, newPassword2, schema, onSubmit } = await usePasswordResetConfirm({
  mismatch: () => t('form.newPassword2.errors.match'),
  successDescription: () => t('success.description'),
  successIcon: 'i-heroicons-check-circle',
})

const strength = computed(() => passwordStrength(newPassword1.value))
const requirements = computed(() => strength.value.requirements.map(requirement => ({
  met: requirement.met,
  text: t(`password.requirements.${requirement.id}`),
})))
const score = computed(() => strength.value.score)
const color = computed(() => strength.value.color)

const strengthText = computed(() => {
  if (score.value === 0) return t('password.strength.none')
  if (score.value <= 2) return t('password.strength.weak')
  if (score.value === 3) return t('password.strength.medium')
  return t('password.strength.strong')
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
      :state="{ newPassword1, newPassword2, key: String(key) }"
      class="space-y-5"
      @error="scrollToFirstFormError"
      @submit="onSubmit"
    >
      <UFormField
        name="newPassword1"
        :label="t('form.newPassword1.label')"
        required
      >
        <WebsideFormPasswordInput
          v-model="newPassword1"
          icon="i-heroicons-key"
          :color="color"
          autocomplete="new-password"
          :placeholder="t('password.placeholder')"
        />

        <template v-if="newPassword1" #hint>
          <div class="mt-2 space-y-2">
            <UProgress
              :color="color"
              :model-value="score"
              :max="4"
              size="sm"
            />

            <p class="text-xs font-medium text-muted">
              {{ strengthText }}. {{ t('password.requirements.title') }}
            </p>

            <ul class="space-y-1">
              <li
                v-for="(req, index) in requirements"
                :key="index"
                class="flex items-center gap-1"
                :class="req.met ? 'text-success' : 'text-muted'"
              >
                <UIcon
                  :name="req.met ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                  class="size-4 shrink-0"
                />
                <span class="text-xs">{{ req.text }}</span>
              </li>
            </ul>
          </div>
        </template>
      </UFormField>

      <UFormField
        name="newPassword2"
        :label="t('form.newPassword2.label')"
        required
      >
        <WebsideFormPasswordInput
          v-model="newPassword2"
          icon="i-heroicons-check-badge"
          autocomplete="new-password"
          :placeholder="t('password.placeholder_confirm')"
        />
      </UFormField>

      <UButton
        type="submit"
        color="neutral"
        variant="subtle"
        :disabled="isSubmitting"
        :loading="isSubmitting"
        block
        size="lg"
        icon="i-heroicons-check-circle"
      >
        {{ t('form.submit') }}
      </UButton>

      <p v-if="score < 4 && newPassword1" class="text-center text-xs text-muted">
        {{ t('password.requirements.complete') }}
      </p>
    </UForm>
  </div>
</template>

<i18n lang="yaml">
el:
  form:
    newPassword1:
      label: Κωδικός πρόσβασης
    newPassword2:
      label: Επιβεβαίωση κωδικού πρόσβασης
      errors:
        match: Η επιβεβαίωση κωδικού πρόσβασης πρέπει να ταιριάζει με τον κωδικό πρόσβασης
    submit: Επαναφορά
  password:
    placeholder: Εισάγετε νέο κωδικό πρόσβασης
    placeholder_confirm: Επιβεβαιώστε τον νέο κωδικό
    strength:
      none: Εισάγετε κωδικό πρόσβασης
      weak: Αδύναμος κωδικός
      medium: Μέτριος κωδικός
      strong: Ισχυρός κωδικός
    requirements:
      title: Πρέπει να περιέχει
      length: Τουλάχιστον 8 χαρακτήρες
      number: Τουλάχιστον 1 αριθμό
      lowercase: Τουλάχιστον 1 πεζό γράμμα
      uppercase: Τουλάχιστον 1 κεφαλαίο γράμμα
      complete: Ολοκληρώστε όλες τις απαιτήσεις για να συνεχίσετε
  success:
    description: Ο κωδικός σας έχει επαναφερθεί επιτυχώς.
  error:
    title: Σφάλμα επαναφοράς
    description: Ο σύνδεσμος επαναφοράς μπορεί να έχει λήξει ή να είναι άκυρος.
</i18n>
