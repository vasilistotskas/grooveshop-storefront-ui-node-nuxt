<script lang="ts" setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  on: {
    type: Boolean,
    default: false,
  },
  id: {
    type: String,
    default: undefined,
  },
})
defineSlots<{
  default(props: object): any
}>()

const emit = defineEmits(['update:modelValue'])
const { on, id } = toRefs(props)

const randomId = () =>
  Math.random().toString(36).substring(2, 15)
  + Math.random().toString(36).substring(2, 15)

const switchId = ref(id?.value || randomId())
const input = ref<HTMLInputElement>()

const checked = useSyncProps<boolean>(props, 'modelValue', emit)
const onInputChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  checked.value = target.checked
  emit('update:modelValue', target.checked)
}

onMounted(() => {
  if (on.value) {
    checked.value = true
    emit('update:modelValue', true)
    if (input.value)
      if ('checked' in input.value) {
        input.value.checked = true
      }
  }
})
</script>

<template>
  <label
    :for="switchId"
    class="flex cursor-pointer"
  >
    <label
      :for="switchId"
      class="
        relative mr-2 inline-block w-10 align-middle transition duration-200
        ease-in select-none
      "
    >
      <input
        :id="switchId"
        ref="input"
        type="checkbox"
        class="
          switch-checkbox absolute block size-6 cursor-pointer appearance-none
          rounded-full border-2 border-slate-300 bg-primary-100
          dark:border-slate-600 dark:bg-primary-900
        "
        :checked="checked"
        name="switch"
        placeholder="Switch"
        @change="onInputChange"
      >
      <label
        :for="switchId"
        class="
          switch-label block h-6 cursor-pointer overflow-hidden rounded-full
          border border-slate-300 bg-primary-100
          dark:border-slate-500 dark:bg-primary-900
        "
      />
    </label>
    <slot />
  </label>
</template>

<style>
.switch-checkbox:checked {
  right: 0;
}
</style>
