<script lang="ts" setup>
/**
 * How strong a new password is: four segments filling as it meets the
 * rubric, and one line saying the verdict and the rubric — the board's
 * "Strong · 8+ characters, …" under the field.
 *
 * The rubric is advisory: length ≥ 8, a digit, a lowercase and an
 * uppercase letter, scored as the number met. Django enforces only the
 * length (8), "not all digits", "not common" and "not like your
 * details", so a form never gates on the score — the server's own
 * refusals arrive as its translated error codes. Letters are Unicode
 * classes: `[a-z]` never matches Greek, so «Καλημέρα2024» scored as if
 * it had no letters at all.
 */
const props = defineProps<{
  password: string
}>()

const { t } = useI18n()

const score = computed(() => {
  const value = props.password ?? ''
  return [/.{8,}/, /\d/, /\p{Ll}/u, /\p{Lu}/u].filter(rule => rule.test(value)).length
})

const color = computed<'neutral' | 'error' | 'warning' | 'success'>(() => {
  if (score.value === 0) return 'neutral'
  if (score.value <= 2) return 'error'
  if (score.value === 3) return 'warning'
  return 'success'
})

const FILL: Record<typeof color.value, string> = {
  neutral: 'bg-accented',
  error: 'bg-error',
  warning: 'bg-warning',
  success: 'bg-success',
}

const label = computed(() => {
  if (score.value <= 2) return t('strength.weak')
  if (score.value === 3) return t('strength.medium')
  return t('strength.strong')
})

defineExpose({ score, color })
</script>

<template>
  <div
    v-if="password"
    class="mt-2 flex flex-col gap-1.5"
    role="status"
    aria-live="polite"
  >
    <div
      class="grid grid-cols-4 gap-1"
      aria-hidden="true"
    >
      <span
        v-for="segment in 4"
        :key="segment"
        class="h-1 rounded-full"
        :class="segment <= score ? FILL[color] : 'bg-elevated'"
      />
    </div>
    <p class="text-xs text-muted">
      <span class="font-semibold text-toned">{{ label }}</span> · {{ t('rubric') }}
    </p>
  </div>
</template>

<i18n lang="yaml">
el:
  rubric: 8+ χαρακτήρες, ένας αριθμός, κεφαλαία και πεζά
  strength:
    weak: Αδύναμος
    medium: Μέτριος
    strong: Ισχυρός
en:
  rubric: 8+ characters, a number, upper and lower case
  strength:
    weak: Weak
    medium: Fair
    strong: Strong
</i18n>
