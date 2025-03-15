<script setup lang="ts">
defineProps({
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

const emit = defineEmits(['goToNextStep', 'goToPreviousStep'])

const { $i18n } = useNuxtApp()
</script>

<template>
  <div
    :class="[
      currentStep === lastStep ? 'justify-between' : 'justify-end',
      'flex',
    ]"
  >
    <UButton
      v-if="currentStep > 0"
      icon="i-heroicons-arrow-long-left"
      color="primary"
      :label="$i18n.t('previous')"
      @click="emit('goToPreviousStep')"
    />

    <UButton
      v-if="currentStep < lastStep"
      icon="i-heroicons-arrow-long-right"
      :disabled="nextStepButtonDisabled"
      color="primary"
      :label="$i18n.t('next')"
      @click="emit('goToNextStep')"
    />

    <UButton
      v-if="currentStep === lastStep"
      type="submit"
      color="primary"
      :label="submitLabel"
    />
  </div>
</template>
