<script lang="ts" setup>
import { type BaseFieldProps, type GenericObject, useForm } from 'vee-validate'
import * as z from 'zod'

import { toTypedSchema } from '@vee-validate/zod'
import type { Ref } from 'vue'
import type { ButtonProps } from '@nuxt/ui'

type DynamicFormState = {
  errors: string[]
}

type DynamicFormFields<
  TValue = any,
  TExtras extends GenericObject = GenericObject,
> = {
  [key: string]: [Ref<TValue>, Ref<BaseFieldProps & TExtras>]
}

type FormValues = {
  [key: string]: unknown
}

interface DisabledFields {
  [key: string]: boolean
}

// Define the UI configuration for Nuxt-UI
const nuxtUiConfig = (state: DynamicFormState) => {
  return {
    props: {
      error: state.errors[0],
    },
  }
}

// Define the props for the component
const props = withDefaults(
  defineProps<{
    id?: string
    schema: DynamicFormSchema
    submitButton?: boolean
    resetButton?: boolean
    buttonLabel?: string
    resetLabel?: string
    disableSubmitUntilValid?: boolean
    submitButtonUi?: ButtonProps & { ui: Record<string, unknown> }
    resetButtonUi?: ButtonProps & { ui: Record<string, unknown> }
    buttonsPosition?: 'center' | 'left' | 'right'
    loading?: boolean
    maxSubmitCount?: number
    resetOnSubmit?: boolean
  }>(),
  {
    id: undefined,
    submitButton: true,
    resetButton: false,
    buttonLabel: 'Submit',
    resetLabel: 'Reset',
    disableSubmitUntilValid: true,
    submitButtonUi: () => ({
      type: 'submit',
      variant: 'solid',
      color: 'neutral',
      size: 'md',
      ui: {},
    }),
    resetButtonUi: () => ({
      type: 'button',
      variant: 'outline',
      color: 'secondary',
      size: 'md',
      ui: {},
    }),
    buttonsPosition: 'right',
    loading: false,
    maxSubmitCount: 5,
    resetOnSubmit: false,
  },
)

const {
  id,
  schema,
  submitButton,
  resetButton,
  buttonLabel,
  resetLabel,
  disableSubmitUntilValid,
  submitButtonUi,
  resetButtonUi,
  loading,
  maxSubmitCount,
  resetOnSubmit,
} = toRefs(props)

const finalID = id.value ?? useId()
const currentStep = ref(0)
const isMultiStep = ref(Array.isArray(schema.value.steps) && schema.value.steps.length > 0)
const lastStep = ref(schema.value.steps?.length ? schema.value.steps.length - 1 : 0)

// Filter the schema fields based on the current step
const formFields = computed(() => {
  return (isMultiStep.value ? schema.value?.steps?.[currentStep.value]?.fields : schema.value.fields) ?? []
})

// Filter the schema fields based on the condition function
const filteredFields = computed(() => {
  return formFields.value.filter((field) => {
    if (!field.condition) {
      return true
    }
    return field.condition(values)
  })
})

// Create an object of disabled fields based on the disabledCondition function
const disabledFields = computed<DisabledFields>(() => {
  if (!formFields.value) {
    return {}
  }
  return formFields.value.reduce((acc: DisabledFields, field) => {
    acc[field.name] = field.disabledCondition ? field.disabledCondition(values) : false
    return acc
  }, {})
})

// Create an array of all field names from all steps
const allSchemaFieldNames = computed(() => {
  if (isMultiStep.value && schema.value.steps) {
    return schema.value.steps.flatMap(step => step.fields.map(field => field.name))
  }
  return formFields.value.map(field => field.name)
})

// Generate complete schema for all fields
const completeGeneratedSchema = computed(() => {
  if (isMultiStep.value && schema.value.steps) {
    const fields = schema.value.steps.flatMap(step =>
      step.fields.map(field => [field.name, field.rules ?? z.any()]),
    )
    return z.object(Object.fromEntries(fields))
  }
  const fields = formFields.value.map(field => [field.name, field.rules ?? z.any()])
  return z.object(Object.fromEntries(fields))
})

// Use schema.fields to generate a Zod schema object for current step
const currentStepSchema = computed(() => {
  const fields = formFields.value.map(field => [field.name, field.rules ?? z.any()])
  return z.object(Object.fromEntries(fields))
})

// Use schema.extraValidation to generate a Zod schema object
const extraValidationSchema = schema.value.extraValidation ? schema.value.extraValidation : z.object({})

// Merge the generated Zod schema object with the extraValidationSchema
const merged = computed(() => {
  const baseSchema = isMultiStep.value ? completeGeneratedSchema.value : currentStepSchema.value

  if (extraValidationSchema instanceof z.ZodEffects) {
    return mergeWithEffect(extraValidationSchema, baseSchema)
  }
  else if (extraValidationSchema instanceof z.ZodObject) {
    return baseSchema.merge(extraValidationSchema)
  }

  console.warn('extraValidationSchema is not an instance of z.ZodEffects or z.ZodObject')
  return baseSchema
})

// Convert the generated Zod schema object to a VeeValidate compatible schema object
const validationSchema = toTypedSchema(merged.value)

const initialFormValues = computed(() => {
  const values: FormValues = {}

  if (isMultiStep.value && schema.value.steps) {
    // For multistep forms, get all fields from all steps
    schema.value.steps.forEach((step) => {
      step.fields.forEach((field) => {
        if (field.initialValue !== undefined) {
          values[field.name] = field.initialValue
        }
      })
    })
  }
  else {
    // For single step forms, use the current fields
    formFields.value.forEach((field) => {
      if (field.initialValue !== undefined) {
        values[field.name] = field.initialValue
      }
    })
  }

  return values
})

const {
  defineField,
  handleSubmit,
  resetForm,
  errors,
  isSubmitting,
  submitCount,
  values,
  validateField,
  setFieldError,
} = useForm({
  validationSchema,
  initialValues: initialFormValues,
  keepValuesOnUnmount: isMultiStep.value,
})

const reset = () => {
  resetForm()
}

// Helper to get current step field names
const currentStepFieldNames = computed(() => {
  const currentStepFields = schema.value.steps?.[currentStep.value]?.fields ?? []
  return currentStepFields.map(field => field.name)
})

// Check if current step has errors
const currentStepHasErrors = computed(() => {
  const currentFields = currentStepFieldNames.value
  return Object.entries(errors.value)
    .some(([field, error]) => currentFields.includes(field) && error)
})

const nextStepButtonDisabled = computed(() => {
  return isSubmitting.value || currentStepHasErrors.value
})

const goToPreviousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
    const nextStepFields = schema.value.steps?.[currentStep.value + 1]?.fields ?? []
    nextStepFields.forEach((field) => {
      setFieldError(field.name, '')
    })
  }
}

const goToNextStep = async () => {
  const currentStepFields = schema.value.steps?.[currentStep.value]?.fields ?? []
  const fieldsToValidate = currentStepFields.map(field => field.name)

  const validationResults = await Promise.all(
    fieldsToValidate.map(field => validateField(field)),
  )

  const isStepValid = validationResults.every(result => result.valid)

  if (isStepValid) {
    if (currentStep.value < lastStep.value) {
      currentStepFields.forEach((field) => {
        setFieldError(field.name, '')
      })
      currentStep.value++
    }
  }
}

// Create an object of field bindings using defineField and nuxtUiConfig functions
function createFields(keys: string[] | undefined): DynamicFormFields {
  if (!keys) {
    return {}
  }
  const fieldValues: DynamicFormFields = {}
  keys.forEach((key) => {
    const [field, fieldProps] = defineField(key, nuxtUiConfig)
    fieldValues[key] = [field, fieldProps]
  })
  return fieldValues
}

const fields = computed(() => createFields(allSchemaFieldNames.value))

// Define the submit event emitter using defineEmits function
const emit = defineEmits<{
  (e: 'submit', payload: any): void
  (e: 'select-menu-change', payload: { target: string, value: string }): void
}>()

// Define the submit event handler using handleSubmit function and emit function
const onSubmit = handleSubmit((actions) => {
  emit('submit', values)

  if (resetOnSubmit.value) {
    actions.resetForm()
  }
})

// Define the form state for Nuxt UI
const formState = computed(() => {
  return Object.fromEntries(
    Object.entries(fields.value).map(([key, value]) => [key, value[0].value]),
  )
})

// Define the select menu items
const getSelectMenuItems = (name: string) => {
  const fields = isMultiStep.value ? schema.value.steps?.[currentStep.value]?.fields : formFields.value

  const field = fields?.find(field => field.name === name)
  if (!field) {
    return []
  }
  const children = field.children
  if (children && children.length > 0) {
    return children.map(child => ({ label: child.label, value: child.value }))
  }
  return []
}

// Define the select menu change handler
const onSelectMenuChange = ({ target, value }: { target: string, value: string }) => {
  emit('select-menu-change', { target, value })
}

// Define the submit button disabled state
const valid = computedAsync(async () => {
  if (submitCount.value >= maxSubmitCount.value || loading.value) {
    return true
  }

  return await validationSchema
    .parse(formState.value)
    .then((result) => {
      const liveResultValid = result.errors.length === 0
      return isSubmitting.value || Object.keys(errors.value).length > 0
        ? !liveResultValid
        : false
    })
    .catch(() => {
      return true
    })
}, disableSubmitUntilValid.value)

// Watch for changes to the disabledFields object
formFields.value.forEach((field) => {
  watch(
    () => disabledFields.value?.[field.name],
    (newVal, oldVal) => {
      if (newVal && !oldVal) {
        const fieldEntry = fields.value[field.name]
        if (fieldEntry && Array.isArray(fieldEntry) && fieldEntry[0]) {
          fieldEntry[0].value = ''
        }
      }
    },
  )
})

// Add stepper items computed property
const stepperItems = computed(() => {
  if (!isMultiStep.value || !schema.value.steps) {
    return []
  }
  return schema.value.steps.map((step, index) => ({
    title: step.title,
    description: step.description,
    icon: step.icon,
    value: index,
    disabled: index > currentStep.value,
  }))
})

defineExpose({
  fields,
  valid,
})
</script>

<template>
  <div class="grid w-full gap-4">
    <UStepper
      v-if="isMultiStep"
      ref="stepper"
      v-model="currentStep"
      color="secondary"
      :items="stepperItems"
      class="w-full"
      size="lg"
      :ui="{
        root: 'pb-4',
        description: 'text-xs',
      }"
      @update:model-value="value => currentStep = Number(value)"
    />

    <UForm
      :id="finalID"
      :state="fields"
      autocomplete="on"
      class="grid w-full gap-4 divide-none dark:divide-primary-800"
      @submit="onSubmit"
    >
      <div class="grid gap-2 md:gap-4">
        <template
          v-for="{
            as,
            id: groupId,
            name,
            label,
            autocomplete = 'off',
            readonly = false,
            required = false,
            hidden = false,
            placeholder = '',
            type = 'text',
            children = [],
            items = [],
          } in filteredFields"
          :key="name"
        >
          <LazyUFormField
            v-if="fields[name]"
            :class="{
              'items-center': true,
              'grid': as !== 'checkbox',
              'gap-1': children && children.length > 0,
              'sr-only': hidden,
              'flex': as === 'checkbox',
              'gap-2': as === 'checkbox',
              'px-4 md:px-8': as === 'radio',
            }"
            :label="label ? label : undefined"
            :name="name"
            :error="errors[name]"
            :required="required"
          >
            <LazyUTextarea
              v-if="as === 'textarea'"
              :id="groupId"
              v-model="fields[name][0].value"
              :aria-readonly="readonly"
              :autocomplete="autocomplete"
              :class="{ 'grid': true, 'gap-1': children && children.length > 0 }"
              :disabled="disabledFields[name]"
              :name="name"
              :placeholder="type === 'text' || type === 'password' || type === 'email' ? placeholder : ''"
              :readonly="readonly"
              :required="required"
              :type="type"
              color="neutral"
              v-bind="fields[name][1].value"
            >
              <div v-if="children && children.length > 0">
                <LazyDynamicFormChildren :children="children" />
              </div>
            </LazyUTextarea>
            <LazyUCheckbox
              v-else-if="as === 'checkbox'"
              :id="groupId"
              v-model="fields[name][0].value"
              :aria-describedby="errors[name] ? `error-${name}` : undefined"
              :aria-invalid="errors[name] ? 'true' : 'false'"
              :aria-readonly="readonly"
              :autocomplete="autocomplete"
              :class="{ 'grid': true, 'gap-1': children && children.length > 0, 'sr-only': hidden }"
              :disabled="disabledFields[name]"
              :hidden="hidden ? 'hidden' : undefined"
              :name="name"
              :placeholder="type === 'text' || type === 'password' || type === 'email' ? placeholder : ''"
              :readonly="readonly"
              :required="required"
              :type="type"
              color="neutral"
              v-bind="fields[name][1].value"
            >
              <div v-if="children && children.length > 0">
                <LazyDynamicFormChildren :children="children" />
              </div>
            </LazyUCheckbox>
            <LazyURadioGroup
              v-else-if="as === 'radio' && items && items.length > 0"
              :id="groupId"
              v-model="fields[name][0].value"
              value-key="value"
              :aria-describedby="errors[name] ? `error-${name}` : undefined"
              :aria-invalid="errors[name] ? 'true' : 'false'"
              :aria-readonly="readonly"
              :autocomplete="autocomplete"
              :class="{ 'grid': true, 'gap-1': children && children.length > 0, 'sr-only': hidden }"
              :disabled="disabledFields[name]"
              :hidden="hidden ? 'hidden' : undefined"
              :name="name"
              :items="items"
              variant="list"
              color="secondary"
              :ui="{
                fieldset: 'max-h-72 overflow-y-auto',
              }"
            >
              <div v-if="children && children.length > 0">
                <LazyDynamicFormChildren :children="children" />
              </div>
            </LazyURadioGroup>
            <LazyUSelectMenu
              v-else-if="as === 'select'"
              v-model="fields[name][0].value"
              :name="name"
              value-key="value"
              :items="getSelectMenuItems(name)"
              :placeholder="type === 'text' || type === 'password' || type === 'email' ? placeholder : ''"
              color="neutral"
              class="w-full"
              @update:model-value="onSelectMenuChange({ target: name, value: fields[name][0].value })"
              @change="onSelectMenuChange({ target: name, value: fields[name][0].value })"
            />
            <UInput
              v-else-if="!hidden || (hidden && !Array.isArray(fields[name][0].value))"
              :id="groupId"
              v-model="fields[name][0].value"
              :aria-describedby="errors[name] ? `error-${name}` : undefined"
              :aria-invalid="errors[name] ? 'true' : 'false'"
              :aria-readonly="readonly"
              :autocomplete="autocomplete"
              :class="{ 'grid': true, 'gap-1': children && children.length > 0, 'sr-only': hidden }"
              :disabled="disabledFields[name]"
              :hidden="hidden ? 'hidden' : undefined"
              :name="name"
              :placeholder="type === 'text' || type === 'password' || type === 'email' ? placeholder : ''"
              :readonly="readonly"
              :required="required"
              :type="type"
              color="neutral"
              v-bind="fields[name][1].value"
            >
              <LazyDynamicFormChildren v-if="children && children.length > 0" :children="children" />
            </UInput>
          </LazyUFormField>
        </template>
      </div>

      <div
        :class="{ 'flex': true, 'justify-end': buttonsPosition === 'right', 'justify-center': buttonsPosition === 'center', 'justify-start': buttonsPosition === 'left' }"
      >
        <LazyDynamicFormNavigation
          v-if="isMultiStep"
          :current-step="currentStep"
          :last-step="lastStep"
          :next-step-button-disabled="nextStepButtonDisabled"
          :submit-label="buttonLabel"
          @go-to-next-step="goToNextStep"
          @go-to-previous-step="goToPreviousStep"
        />

        <UButton
          v-if="!isMultiStep && submitButton"
          v-bind="submitButtonUi"
          :aria-busy="isSubmitting"
          :disabled="valid"
          :label="buttonLabel"
        />

        <UButton
          v-if="!isMultiStep && resetButton"
          :color="resetButtonUi?.color"
          :size="resetButtonUi?.size"
          :type="resetButtonUi?.type"
          :ui="resetButtonUi?.ui"
          :variant="resetButtonUi?.variant"
          @click="reset"
        >
          {{ resetLabel }}
        </UButton>
      </div>
    </UForm>
  </div>
</template>
