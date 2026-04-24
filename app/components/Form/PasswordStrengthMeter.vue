<script lang="ts" setup>
/**
 * Password strength indicator — 4 requirements, 4-step progress bar.
 *
 * Extracted from Account/Password/ChangeForm.vue so signup and reset
 * flows share the exact same strength rubric: length ≥ 8, a digit, a
 * lowercase and an uppercase letter. Score is `requirements met`.
 * Reduced-motion is inherited from the global CSS rule.
 */

const props = defineProps<{
  password: string
}>()

const { t } = useI18n()

const requirements = computed(() => {
  const p = props.password ?? ''
  return [
    { met: /.{8,}/.test(p), text: t('requirements.length') },
    { met: /\d/.test(p), text: t('requirements.number') },
    { met: /[a-z]/.test(p), text: t('requirements.lowercase') },
    { met: /[A-Z]/.test(p), text: t('requirements.uppercase') },
  ]
})

const score = computed(() => requirements.value.filter(r => r.met).length)

const color = computed<'neutral' | 'error' | 'warning' | 'success'>(() => {
  if (score.value === 0) return 'neutral'
  if (score.value <= 2) return 'error'
  if (score.value === 3) return 'warning'
  return 'success'
})

const label = computed(() => {
  if (score.value === 0) return t('strength.none')
  if (score.value <= 2) return t('strength.weak')
  if (score.value === 3) return t('strength.medium')
  return t('strength.strong')
})

defineExpose({ score, color })
</script>

<template>
  <div
    v-if="password"
    class="mt-3 space-y-2"
    role="status"
    aria-live="polite"
  >
    <UProgress
      :color="color"
      :model-value="score"
      :max="4"
      size="sm"
    />

    <p class="flex items-center gap-2 text-sm font-medium">
      <UIcon
        :name="score === 4 ? 'i-heroicons-shield-check' : 'i-heroicons-shield-exclamation'"
        :class="score === 4 ? 'text-success' : 'text-warning'"
        class="size-4"
      />
      {{ label }}
    </p>

    <ul class="mt-3 space-y-1.5" :aria-label="t('requirements.title')">
      <li
        v-for="(req, index) in requirements"
        :key="index"
        class="flex items-center gap-2 text-xs"
        :class="req.met ? 'text-success' : 'text-gray-500 dark:text-gray-200'"
      >
        <UIcon
          :name="req.met ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
          class="size-4 shrink-0"
        />
        <span>{{ req.text }}</span>
      </li>
    </ul>
  </div>
</template>

<i18n lang="yaml">
el:
  requirements:
    title: Απαιτήσεις κωδικού πρόσβασης
    length: Τουλάχιστον 8 χαρακτήρες
    number: Τουλάχιστον 1 αριθμός
    lowercase: Τουλάχιστον 1 πεζό γράμμα
    uppercase: Τουλάχιστον 1 κεφαλαίο γράμμα
  strength:
    none: Εισάγετε κωδικό
    weak: Αδύναμος κωδικός
    medium: Μέτριος κωδικός
    strong: Ισχυρός κωδικός
</i18n>
