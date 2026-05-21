<script lang="ts" setup>
const formState = defineModel<Record<string, any>>('formState', { required: true })

defineProps<{
  schema: any
  payWayOptions: Array<{ label: string, value: number, mainImagePath?: string, isOnlinePayment?: boolean }>
  isSubmitting: boolean
}>()

const emit = defineEmits<{
  submit: []
  back: []
}>()

const { t } = useI18n()

// Expose the form's submit() so the primary CTA (now living in
// the checkout sidebar) can trigger Zod validation + emit `submit`.
const formRef = useTemplateRef<{ submit: () => Promise<void> }>('formRef')
defineExpose({
  submit: () => formRef.value?.submit(),
})
</script>

<template>
  <UCard class="overflow-hidden">
    <template #header>
      <h2 class="text-xl font-semibold">
        {{ t('steps.payment') }}
      </h2>
    </template>

    <UForm ref="formRef" :state="formState" :schema="schema" class="space-y-6" @submit="emit('submit')">
      <UFormField
        :label="t('form.payment_method')"
        name="payWay"
        required
        :ui="{
          label: `
            text-lg font-medium text-primary-900
            dark:text-primary-100
          `,
          wrapper: 'mb-2',
        }"
      >
        <URadioGroup
          v-model="formState.payWay"
          :items="payWayOptions"
          variant="card"
          size="xl"
          class="w-full"
          :ui="{
            item: 'flex cursor-pointer items-center',
            wrapper: 'ms-4',
            root: `
              max-h-80 overflow-y-auto
              md:max-h-120
            `,
          }"
        >
          <template #label="{ item }">
            <div class="flex items-center justify-between gap-3">
              <span class="font-medium">{{ item.label }}</span>
              <div
                v-if="item.mainImagePath"
                class="
                  flex size-12 shrink-0 items-center justify-center
                  overflow-hidden rounded-lg
                "
              >
                <ImgWithFallback
                  class="size-full object-contain dark:invert"
                  :style="{ contentVisibility: 'auto' }"
                  :src="item.mainImagePath"
                  :width="48"
                  :height="48"
                  fit="contain"
                  :format="'svg'"
                  :background="'transparent'"
                  :alt="`${item.label} payment method`"
                  densities="x1"
                />
              </div>
            </div>
          </template>
        </URadioGroup>
      </UFormField>

      <!-- Place-order CTA lives in the checkout sidebar so it sits
           next to the order total. -->
      <div class="flex items-center pt-4">
        <UButton
          variant="ghost"
          icon="i-heroicons-arrow-left"
          type="button"
          @click="emit('back')"
        >
          {{ t('back') }}
        </UButton>
      </div>
    </UForm>
  </UCard>
</template>

<i18n lang="yaml">
el:
  steps:
    payment: Πληρωμή
  form:
    payment_method: Τρόπος πληρωμής
  back: Πίσω
</i18n>
