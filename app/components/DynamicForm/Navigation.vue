<script lang="ts" setup>
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
  <div class="flex w-full items-center justify-between">
    <UButton
      v-if="currentStep > 0"
      icon="i-heroicons-chevron-left"
      color="neutral"
      variant="ghost"
      :label="$i18n.t('previous')"
      @click="emit('goToPreviousStep')"
    />
    <div v-else />
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
      type="submit"
      color="success"
      variant="subtle"
      :label="submitLabel"
      :ui="{
        base: '!rounded-full',
      }"
    />
  </div>
</template>
