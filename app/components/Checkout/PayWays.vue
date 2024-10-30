<script lang="ts" setup>
import type { PayWay } from '~/types/pay-way'
import type { Pagination } from '~/types'

defineSlots<{
  error(props: object): any
}>()

const { t, locale } = useI18n({ useScope: 'local' })

const emit = defineEmits(['update-model'])

const { data: payWays, status } = await useAsyncData<Pagination<PayWay>>('payWays', () =>
  $fetch<Pagination<PayWay>>('/api/pay-way', {
    method: 'GET',
    query: {
      language: locale.value,
    },
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
    <LazyURadioGroup
      v-if="status !== 'pending' && payWays?.results?.length"
      v-model="selectedPayWay"
      :legend="t('title')"
      :options="options"
      :ui="{
        fieldset: 'w-full',
      }"
    />
    <slot name="error" />
  </div>
</template>

<i18n lang="yaml">
el:
  title: Επιλέξτε τον τρόπο πληρωμής
</i18n>
