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
      color="white"
      @click="emit('goToPreviousStep')"
    >
      {{ $t('common.previous') }}
    </UButton>

    <UButton
      v-if="currentStep < lastStep"
      icon="i-heroicons-arrow-long-right"
      :disabled="nextStepButtonDisabled"
      color="white"
      @click="emit('goToNextStep')"
    >
      {{ $t('common.next') }}
    </UButton>

    <UButton v-if="currentStep === lastStep" type="submit" color="white">
      {{ submitLabel }}
    </UButton>
  </div>
</template>

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
</script>
