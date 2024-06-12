<script lang="ts" setup>
import type { PayWay } from '~/types/pay-way'

defineSlots<{
  error(props: object): any
}>()

const { locale } = useI18n()

const emit = defineEmits(['update-model'])

const { data: payWays, pending } = await useAsyncData('payWays', () =>
  $fetch('/api/pay-way', {
    method: 'GET',
    language: locale.value,
  }),
)

const payWay = useState<PayWay | null>(
  'selectedPayWay',
  () => payWays.value?.results?.[0] || null,
)

const selectedPayWay = ref(payWay.value?.id)

const options = computed(() => {
  return payWays.value?.results?.map(payWay => ({
    value: payWay.id,
    label: extractTranslated(payWay, 'name', locale.value),
  }))
})

const updatePayWay = (value: PayWay) => {
  emit('update-model', payWay)
  payWay.value = value
}

watch(selectedPayWay, (value) => {
  const payWay = payWays.value?.results?.find(payWay => payWay.id === value)
  if (payWay) {
    updatePayWay(payWay)
  }
})
</script>

<template>
  <div class="grid gap-4">
    <URadioGroup
      v-if="!pending && payWays?.results?.length"
      v-model="selectedPayWay"
      :legend="$t('components.checkout.pay_ways.title')"
      :options="options"
      :ui="{
        fieldset: 'w-full',
      }"
    />
    <slot name="error" />
  </div>
</template>
