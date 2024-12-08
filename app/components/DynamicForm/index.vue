<script lang="ts" setup>
import { type BaseFieldProps, type GenericObject, useForm, type ValidationOptions } from 'vee-validate'
import * as z from 'zod'

import { toTypedSchema } from '@vee-validate/zod'
import type { Ref } from 'vue'
import type { Button } from '#ui/types/button'

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
    submitButtonUi?: Button & { ui: Record<string, unknown> }
    resetButtonUi?: Button & { ui: Record<string, unknown> }
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
      variant: 'soft',
      color: 'primary',
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
const formFields = shallowRef((isMultiStep.value ? schema.value?.steps?.[currentStep.value]?.fields : schema.value.fields) ?? [])

// Filter the schema fields based on the condition function
const filteredFields = computed(() => {
  return formFields.value.filter((field) => {
    // If no condition is specified, always show the field
    if (!field.condition) {
      return true
    }
    // Otherwise, evaluate the condition function with the current form state
    return field.condition(formState.value)
  })
})

// Create an object of disabled fields based on the disabledCondition function
const disabledFields = computed<DisabledFields>(() => {
  if (!formFields.value) {
    return {}
  }
  return formFields.value.reduce((acc: DisabledFields, field) => {
    acc[field.name] = field.disabledCondition ? field.disabledCondition(formState.value) : false
    return acc
  }, {})
})

// Create an array of field names from the schema object
const schemaFieldNames = shallowRef(formFields.value.map(field => field.name))

// Use schema.fields to generate a Zod schema object
const generatedSchema = z.object(
  Object.fromEntries(formFields.value.map(field => [field.name, field.rules])),
)

// Use schema.extraValidation to generate a Zod schema object
const extraValidationSchema = schema.value.extraValidation ? schema.value.extraValidation : z.object({})

// Merge the generated Zod schema object with the extraValidationSchema
const merged = computed(() => {
  if (extraValidationSchema instanceof z.ZodEffects) {
    return mergeWithEffect(extraValidationSchema, generatedSchema)
  }
  else if (extraValidationSchema instanceof z.ZodObject) {
    return generatedSchema.merge(extraValidationSchema)
  }

  console.warn('extraValidationSchema is not an instance of z.ZodEffects or z.ZodObject')
  return generatedSchema
})

// Convert the generated Zod schema object to a VeeValidate compatible schema object
const validationSchema = toTypedSchema(merged.value)

// Create an object of initial form values from the schema object
const initialFormValues = reactive(formFields.value.reduce((acc: FormValues, field) => {
  acc[field.name] = field.initialValue
  return acc
}, {}))

const {
  defineField,
  handleSubmit,
  resetForm,
  errors,
  isSubmitting,
  validate,
  submitCount,
} = useForm({
  validationSchema,
  initialValues: initialFormValues,
  keepValuesOnUnmount: isMultiStep.value,
})

const goToNextStep = async () => {
  const currentStepFields = schema.value.steps?.[currentStep.value]?.fields ?? []
  const fieldsToValidate = currentStepFields.map(field => field.name) as Partial<ValidationOptions>
  const isValid = await validate(fieldsToValidate).then(result => result.valid)
  if (isValid) {
    if (currentStep.value < lastStep.value) {
      currentStep.value++
    }
  }
}

const goToPreviousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// Create an object of field bindings using defineField and nuxtUiConfig functions
function createFields(keys: string[] | undefined): DynamicFormFields {
  if (!keys) {
    return {}
  }
  const fieldValues: DynamicFormFields = {}
  keys.forEach((key) => {
    // Use defineField for each key and store the result in fieldValues
    const [field, fieldProps] = defineField(key, nuxtUiConfig)
    fieldValues[key] = [field, fieldProps]
  })
  return fieldValues
}

const fields = reactive(createFields(schemaFieldNames.value))

// Define the submit event emitter using defineEmits function
const emit = defineEmits(['submit'])

// Define the submit event handler using handleSubmit function and emit function
const onSubmit = handleSubmit((values, actions) => {
  emit('submit', values)

  if (resetOnSubmit.value) {
    actions.resetForm()
  }
})

// Define the form state for Nuxt UI
const formState = computed(() => {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, value[0].value]),
  )
})

// Define the submit button disabled state
const valid = computedAsync(async () => {
  if (submitCount.value >= maxSubmitCount.value || loading.value) {
    return true
  }

  return await validationSchema
    .parse(formState.value)
    .then((result) => {
      const liveResultValid = result.errors.length === 0
      return isSubmitting.value || Object.keys(errors.value).length > 0 || disableSubmitUntilValid.value
        ? !liveResultValid
        : false
    })
    .catch(() => {
      return true
    })
}, disableSubmitUntilValid.value)

const nextStepButtonDisabled = computed(() => {
  return isSubmitting.value || Object.keys(errors.value).length > 0 || disableSubmitUntilValid.value
})

// Watch for changes to the disabledFields object
formFields.value.forEach((field) => {
  watch(
    () => disabledFields.value?.[field.name],
    (newVal, oldVal) => {
      if (newVal && !oldVal) {
        const fieldEntry = fields[field.name]
        if (fieldEntry && Array.isArray(fieldEntry) && fieldEntry[0]) {
          fieldEntry[0].value = ''
        }
      }
    },
  )
})

defineExpose({
  valid,
})
</script>

<template>
  <UForm
    :id="finalID"
    :state="fields"
    autocomplete="on"
    class="grid w-full gap-4"
    @submit="onSubmit"
  >
    <div
      v-if="isMultiStep && schema.steps?.[currentStep]?.title"
      class="grid items-center justify-center"
    >
      <span class="text-xl font-semibold">{{ schema.steps?.[currentStep]?.title }}</span>
    </div>

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
      } in filteredFields"
      :key="name"
    >
      <LazyUFormGroup
        v-if="fields[name]"
        v-model="fields[name][0].value"
        :class="{ 'items-center': true, 'grid': as !== 'checkbox', 'gap-1': children && children.length > 0, 'sr-only': hidden, 'flex': as === 'checkbox', 'gap-2': as === 'checkbox' }"
        :label="label ? label : undefined"
        :name="name"
        v-bind="fields[name][1].value"
      >
        <label
          v-if="label && as === 'input'"
          :for="name"
          class="sr-only"
        >{{ label }}</label>
        <LazyUTextarea
          v-if="as === 'textarea'"
          :id="groupId"
          v-model="fields[name][0].value"
          :aria-readonly="readonly"
          :as="as"
          :autocomplete="autocomplete"
          :class="{ 'grid': true, 'gap-1': children && children.length > 0 }"
          :disabled="disabledFields[name]"
          :name="name"
          :placeholder="type === 'text' || type === 'password' || type === 'email' ? placeholder : ''"
          :readonly="readonly"
          :required="required"
          :type="type"
          color="primary"
          v-bind="fields[name][1].value"
        >
          <div v-if="children && children.length > 0">
            <LazyDynamicFormChildren :children="children" />
          </div>
        </LazyUTextarea>
        <UCheckbox
          v-else-if="as === 'checkbox'"
          :id="groupId"
          v-model="fields[name][0].value"
          :aria-describedby="errors[name] ? `error-${name}` : undefined"
          :aria-invalid="errors[name] ? 'true' : 'false'"
          :aria-readonly="readonly"
          :as="as"
          :autocomplete="autocomplete"
          :class="{ 'grid': true, 'gap-1': children && children.length > 0, 'sr-only': hidden }"
          :disabled="disabledFields[name]"
          :hidden="hidden ? 'hidden' : undefined"
          :name="name"
          :placeholder="type === 'text' || type === 'password' || type === 'email' ? placeholder : ''"
          :readonly="readonly"
          :required="required"
          :type="type"
          color="primary"
          v-bind="fields[name][1].value"
        >
          <div v-if="children && children.length > 0">
            <LazyDynamicFormChildren :children="children" />
          </div>
        </UCheckbox>
        <UInput
          v-else
          :id="groupId"
          v-model="fields[name][0].value"
          :aria-describedby="errors[name] ? `error-${name}` : undefined"
          :aria-invalid="errors[name] ? 'true' : 'false'"
          :aria-readonly="readonly"
          :as="as"
          :autocomplete="autocomplete"
          :class="{ 'grid': true, 'gap-1': children && children.length > 0, 'sr-only': hidden }"
          :disabled="disabledFields[name]"
          :hidden="hidden ? 'hidden' : undefined"
          :name="name"
          :placeholder="type === 'text' || type === 'password' || type === 'email' ? placeholder : ''"
          :readonly="readonly"
          :required="required"
          :type="type"
          color="primary"
          v-bind="fields[name][1].value"
        >
          <LazyDynamicFormChildren v-if="children && children.length > 0" :children="children" />
        </UInput>
      </LazyUFormGroup>
    </template>

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
        @click="resetForm"
      >
        {{ resetLabel }}
      </UButton>
    </div>
  </UForm>
</template>
