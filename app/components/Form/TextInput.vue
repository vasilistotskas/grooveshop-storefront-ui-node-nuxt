<script lang="ts" setup>
import type { BaseFieldProps, GenericObject } from 'vee-validate'
import type { PropType } from 'vue'
import type { InputProps } from '@nuxt/ui'

defineProps({
  bind: {
    type: Object as PropType<BaseFieldProps & GenericObject>,
    default: undefined,
  },
  placeholder: {
    type: String,
    default: '',
  },
  size: {
    type: String as PropType<InputProps['size']>,
    default: 'md',
  },
  type: {
    type: String,
    default: 'text',
    validator: (value: string) =>
      ['text', 'password', 'date', 'email', 'number', 'file'].includes(value),
  },
  id: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    default: '',
  },
  required: {
    type: Boolean,
    default: false,
  },
  autocomplete: {
    type: String,
    default: 'off',
  },
  as: {
    type: String,
    default: 'input',
  },
  icon: {
    type: String,
    default: '',
  },
  trailing: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  padded: {
    type: Boolean,
    default: true,
  },
  ui: {
    type: Object,
    default: () => ({}),
  },
})

const modelValue = defineModel<string | number | undefined>('modelValue', {
  default: '',
})
</script>

<template>
  <UInput
    :id="id"
    v-model="modelValue"
    v-bind="bind"
    :name="name"
    :type="type"
    :placeholder="
      type === 'text' || type === 'password' || type === 'email'
        ? placeholder
        : ''
    "
    :required="required"
    :autocomplete="autocomplete"
    :icon="icon"
    :trailing="trailing"
    :disabled="disabled"
    :loading="loading"
    :padded="padded"
    :size="size"
    :ui="ui"
  />
</template>
