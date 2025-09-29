<script lang="ts" setup>
const props = defineProps({
  currentStep: {
    type: Number,
    default: 0,
  },
  lastStep: {
    type: Number,
    default: 0,
  },
  nextStepButtonDisabled: {
    type: Boolean,
    default: false,
  },
  submitLabel: {
    type: String,
    default: 'Submit',
  },
})

const { currentStep, lastStep } = toRefs(props)

const emit = defineEmits(['goToNextStep', 'goToPreviousStep', 'submit'])

const { $i18n } = useNuxtApp()

const hasPrevious = computed(() => {
  return currentStep.value > 0
})

const handleSubmit = () => {
  console.log('Navigation submit clicked')
  emit('submit')
}
</script>

<template>
  <div
    class="flex w-full items-center"
    :class="{
      'justify-between': hasPrevious,
      'justify-end': !hasPrevious,
    }"
  >
    <UButton
      v-if="currentStep > 0"
      icon="i-heroicons-chevron-left"
      color="neutral"
      variant="ghost"
      :label="$i18n.t('previous')"
      @click="emit('goToPreviousStep')"
    />
    <UButton
      v-if="currentStep < lastStep"
      icon="i-heroicons-chevron-right"
      :disabled="nextStepButtonDisabled"
      color="neutral"
      variant="solid"
      :label="$i18n.t('next')"
      trailing
      @click="emit('goToNextStep')"
    />
    <UButton
      v-if="currentStep === lastStep"
      color="success"
      variant="subtle"
      :label="submitLabel"
      :ui="{
        base: '!rounded-full',
      }"
      @click="handleSubmit"
    />
  </div>
</template>
