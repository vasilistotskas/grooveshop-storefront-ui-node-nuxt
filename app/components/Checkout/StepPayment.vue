<script lang="ts" setup>
const formState = defineModel<Record<string, any>>('formState', { required: true })

const props = defineProps<{
  schema: any
  payWayOptions: Array<{
    label: string
    value: number
    mainImagePath?: string
    isOnlinePayment?: boolean
    /** Operator-authored TinyMCE HTML from Django admin. */
    description?: string
    instructions?: string
  }>
  isSubmitting: boolean
}>()

const emit = defineEmits<{
  submit: []
  back: []
}>()

const { t } = useI18n()

// Instructions belong to ONE method — the chosen one — so they render
// once below the group rather than inside every card. Keeping them out
// of the radio list also keeps them out of its `overflow-y-auto`
// container, where an expanding block fights the scroll position.
const selectedPayWay = computed(() =>
  props.payWayOptions.find(option => option.value === formState.value.payWay),
)

const selectedInstructions = computed(() =>
  sanitizeRichHtml(selectedPayWay.value?.instructions),
)

const hasInstructions = computed(() =>
  selectedInstructions.value.trim().length > 0,
)

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

          <!-- Operator-authored, so sanitised like every other WYSIWYG
               field (`sanitizeRichHtml`, same helper the blog body and
               product description use). Overriding the slot rather than
               letting `descriptionKey` render it as plain text, which
               would print the `<div>` wrapper TinyMCE stores. -->
          <template #description="{ item }">
            <div
              v-if="item.description"
              class="pay-way-description text-sm"
              v-html="sanitizeRichHtml(item.description)"
            />
          </template>
        </URadioGroup>
      </UFormField>

      <UAlert
        v-if="hasInstructions"
        icon="i-heroicons-information-circle"
        color="neutral"
        variant="soft"
        :title="t('form.payment_instructions')"
        :ui="{ description: 'text-sm' }"
      >
        <template #description>
          <div class="pay-way-instructions" v-html="selectedInstructions" />
        </template>
      </UAlert>

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

<style scoped>
/* TinyMCE stores ordered/unordered lists; without list-style they
   render as unmarked lines and the numbered steps lose their order. */
.pay-way-instructions :deep(ol) {
  list-style: decimal;
  padding-inline-start: 1.25rem;
}

.pay-way-instructions :deep(ul) {
  list-style: disc;
  padding-inline-start: 1.25rem;
}

.pay-way-instructions :deep(p),
.pay-way-instructions :deep(ol),
.pay-way-instructions :deep(ul) {
  margin-block: 0.375rem;
}

.pay-way-instructions :deep(li) {
  margin-block: 0.125rem;
}
</style>

<i18n lang="yaml">
el:
  steps:
    payment: Πληρωμή
  form:
    payment_method: Τρόπος πληρωμής
    payment_instructions: Οδηγίες πληρωμής
  back: Πίσω
</i18n>
