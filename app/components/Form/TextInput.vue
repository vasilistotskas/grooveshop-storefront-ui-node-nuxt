<script lang="ts" setup>
import type { BaseFieldProps, GenericObject } from 'vee-validate'
import type { PropType } from 'vue'
import type { ButtonSize, InputVariant, InputColor } from '#ui/types'

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
    type: String as PropType<ButtonSize>,
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
  color: {
    type: String as PropType<InputColor>,
    default: 'primary',
  },
  variant: {
    type: String as PropType<InputVariant>,
    default: 'outline',
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
    :color="color"
    :placeholder="
      type === 'text' || type === 'password' || type === 'email'
        ? placeholder
        : ''
    "
    :required="required"
    :autocomplete="autocomplete"
    :variant="variant"
    :icon="icon"
    :trailing="trailing"
    :disabled="disabled"
    :loading="loading"
    :padded="padded"
    :ui="ui"
  />
</template>
