<script lang="ts" setup>
defineSlots<{
  error(props: object): any
}>()

const { t, locale } = useI18n({ useScope: 'local' })

const emit = defineEmits(['update-model'])

const { data: payWays, status } = await useFetch<Pagination<PayWay>>(
  '/api/pay-way',
  {
    key: 'payWays',
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      language: locale,
    },
  },
)

const payWay = useState<PayWay | null>(
  'selectedPayWay',
  () => payWays.value?.results?.[0] || null,
)

const selectedPayWay = ref(payWay.value?.id)

const items = computed(() => {
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
      v-if="status !== 'pending' && payWays?.count"
      v-model="selectedPayWay"
      class="max-h-72 overflow-y-auto"
      value-key="value"
      :legend="t('title')"
      :items="items"
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
