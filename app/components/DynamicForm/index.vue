<script lang="ts" setup generic="T extends DynamicFormSchema">
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const props = withDefaults(defineProps<{
  schema: T
  buttonLabel?: string
  loading?: boolean
  resetOnSubmit?: boolean
}>(), {
  buttonLabel: 'Submit',
  loading: false,
  resetOnSubmit: false,
})

// Keep emit simple - let parent components handle the typing
const emit = defineEmits<{
  submit: [values: InferZodSchemaType<T>]
  selectMenuChange: [payload: { target: string, value: any }]
}>()

// Create a combined Zod schema from all steps or fields
const combinedSchema = computed(() => {
  if (props.schema.steps) {
    const schemaObject: Record<string, z.ZodType> = {}
    for (const step of props.schema.steps) {
      for (const field of step.fields) {
        schemaObject[field.name] = field.rules
      }
    }
    return z.object(schemaObject)
  }

  if (props.schema.fields) {
    const schemaObject: Record<string, z.ZodType> = {}
    for (const field of props.schema.fields) {
      schemaObject[field.name] = field.rules
    }
    return z.object(schemaObject)
  }

  return z.object({})
})

// Initialize form state with initial values
const formState = reactive<Record<string, any>>({})
const initializedFields = new Set<string>()

// Set initial values only once per field
watchEffect(() => {
  const allFields = props.schema.steps
    ? props.schema.steps.flatMap(step => step.fields)
    : props.schema.fields || []

  for (const field of allFields) {
    // Only set initial value if field hasn't been initialized yet
    if (
      !initializedFields.has(field.name)
      && field.initialValue !== undefined
      && field.initialValue !== null
    ) {
      formState[field.name] = field.initialValue
      initializedFields.add(field.name)
    }
  }
})

const currentStepIndex = ref(0)
const stepper = useTemplateRef<{ hasNext: boolean, hasPrev: boolean, next: () => void, prev: () => void }>('stepper')
const form = useTemplateRef<{ validate: (options?: { name?: string[], silent?: boolean }) => Promise<void> }>('form')

// Expose fields for parent component access (for backward compatibility)
interface FieldExport {
  value: any
}

const fields = computed(() => {
  const fieldsMap: Record<string, FieldExport[]> = {}

  const allFields = props.schema.steps
    ? props.schema.steps.flatMap(step => step.fields)
    : props.schema.fields || []

  for (const field of allFields) {
    if (!fieldsMap[field.name]) {
      fieldsMap[field.name] = []
    }
    fieldsMap[field.name]!.push({
      value: formState[field.name],
    })
  }

  return fieldsMap
})

// Methods to get/set field values
function getFieldValue(fieldName: string): any {
  return formState[fieldName]
}

function setFieldValue(fieldName: string, value: any): void {
  formState[fieldName] = value
}

// Method to reset form - fixed to avoid ESLint error
function resetForm(): void {
  // Get all keys first, then delete them
  const keys = Object.keys(formState)
  keys.forEach((key) => {
    formState[key] = undefined
  })
  initializedFields.clear()
}

defineExpose({
  fields,
  formState,
  getFieldValue,
  setFieldValue,
  resetForm,
})

// Stepper item interface
interface StepperItem {
  title?: string
  description?: string
  icon?: string
  value: number
}

// Convert steps to stepper items
const stepperItems = computed(() => {
  if (!props.schema.steps) {
    return []
  }

  return props.schema.steps.map((step, index: number): StepperItem => ({
    title: step.title,
    description: step.description,
    icon: step.icon,
    value: index,
  }))
})

// Get current step fields
const currentStepFields = computed(() => {
  if (!props.schema.steps || currentStepIndex.value >= props.schema.steps.length) {
    return []
  }
  return props.schema.steps[currentStepIndex.value]?.fields
})

// Check if field should be visible based on condition
function isFieldVisible(field: DynamicFormSchemaField): boolean {
  if (field.hidden) {
    return false
  }

  if (typeof field.condition === 'function') {
    return field.condition(formState)
  }

  return field.condition !== false
}

// Check if field should be disabled based on disabledCondition
function isFieldDisabled(field: DynamicFormSchemaField): boolean {
  if (field.readonly) {
    return true
  }

  if (typeof field.disabledCondition === 'function') {
    return field.disabledCondition(formState)
  }

  return field.disabledCondition === true
}

// Handle step change
function handleStepChange(value: string | number | undefined): void {
  if (typeof value === 'number') {
    currentStepIndex.value = value
  }
}

// Handle next step
async function handleNext(): Promise<void> {
  try {
    // Validate current step fields
    const currentStepFieldNames = currentStepFields.value?.map((f: DynamicFormSchemaField) => f.name)
    await form.value?.validate({
      name: currentStepFieldNames,
      silent: false,
    })

    // Move to next step
    if (stepper.value?.hasNext) {
      stepper.value.next()
    }
  }
  catch (error) {
    // Validation failed, stay on current step
    console.error('Validation failed:', error)
  }
}

// Handle previous step
function handlePrev(): void {
  if (stepper.value?.hasPrev) {
    stepper.value.prev()
  }
}

// Handle form submission
async function handleSubmit(event: FormSubmitEvent<any>): Promise<void> {
  emit('submit', event.data as InferZodSchemaType<T>)

  if (props.resetOnSubmit) {
    resetForm()
  }
}

// Handle select change
function handleSelectChange(fieldName: string, value: any): void {
  formState[fieldName] = value
  emit('selectMenuChange', { target: fieldName, value })
}

// Select option interface
interface SelectOption {
  label: string
  value: string | number | boolean
  disabled?: boolean
}

// Render select options for native select
function getSelectOptions(field: DynamicFormSchemaField): SelectOption[] {
  if (!field.children) {
    return []
  }

  return field.children.map((child: DynamicFormChildElement): SelectOption => ({
    label: child.label || child.text,
    value: child.value ?? child.text,
    disabled: child.disabled,
  }))
}
</script>

<template>
  <div v-if="schema.steps && schema.steps.length > 0" class="space-y-6">
    <UStepper
      ref="stepper"
      v-model="currentStepIndex"
      :items="stepperItems"
      @update:model-value="handleStepChange"
    >
      <template #content>
        <UForm
          ref="form"
          :state="formState"
          :schema="combinedSchema"
          class="space-y-4"
          @submit="handleSubmit"
        >
          <div
            v-for="field in currentStepFields"
            :key="field.name"
            :class="{
              hidden: !isFieldVisible(field),
            }"
          >
            <!-- Input field -->
            <UFormField
              v-if="field.as === 'input'"
              :label="field.label"
              :name="field.name"
              :required="field.required"
              :ui="schema.ui"
            >
              <UInput
                v-model="formState[field.name]"
                :type="field.type"
                :placeholder="field.placeholder"
                :autocomplete="field.autocomplete"
                :disabled="isFieldDisabled(field)"
                :readonly="field.readonly"
                :ui="field.ui"
              />
            </UFormField>

            <!-- Textarea field -->
            <UFormField
              v-else-if="field.as === 'textarea'"
              :label="field.label"
              :name="field.name"
              :required="field.required"
              :ui="schema.ui"
            >
              <UTextarea
                v-model="formState[field.name]"
                :placeholder="field.placeholder"
                :autocomplete="field.autocomplete"
                :disabled="isFieldDisabled(field)"
                :readonly="field.readonly"
                :ui="field.ui"
              />
            </UFormField>

            <!-- Select field -->
            <UFormField
              v-else-if="field.as === 'select'"
              :label="field.label"
              :name="field.name"
              :required="field.required"
              :ui="schema.ui"
            >
              <USelect
                v-model="formState[field.name]"
                :items="getSelectOptions(field)"
                :placeholder="field.placeholder"
                :disabled="isFieldDisabled(field)"
                :ui="field.ui"
                @update:model-value="(value: any) => handleSelectChange(field.name, value)"
              />
            </UFormField>

            <!-- Radio field -->
            <UFormField
              v-else-if="field.as === 'radio' && field.items"
              :name="field.name"
              :required="field.required"
              :ui="schema.ui"
            >
              <URadioGroup
                v-model="formState[field.name]"
                :legend="field.label"
                :items="field.items"
                :color="field.color || 'primary'"
                :disabled="isFieldDisabled(field)"
                :ui="field.ui"
              />
            </UFormField>

            <!-- Checkbox field -->
            <UFormField
              v-else-if="field.as === 'checkbox'"
              :name="field.name"
              :required="field.required"
              :ui="schema.ui"
            >
              <UCheckbox
                v-model="formState[field.name]"
                :label="field.label"
                :disabled="isFieldDisabled(field)"
                :ui="field.ui"
              />
            </UFormField>
          </div>

          <!-- Navigation buttons for stepper -->
          <div
            v-if="schema.steps && schema.steps.length > 1" class="
              flex justify-between gap-2 pt-4
            "
          >
            <UButton
              type="button"
              variant="outline"
              :disabled="!stepper?.hasPrev"
              @click="handlePrev"
            >
              Previous
            </UButton>

            <UButton
              v-if="currentStepIndex < schema.steps.length - 1"
              type="button"
              @click="handleNext"
            >
              Next
            </UButton>

            <UButton
              v-else
              type="submit"
              color="info"
              :loading="loading"
            >
              {{ buttonLabel }}
            </UButton>
          </div>

          <!-- Submit button for non-stepper forms -->
          <div v-else class="pt-4">
            <UButton
              type="submit"
              color="success"
              :loading="loading"
            >
              {{ buttonLabel }}
            </UButton>
          </div>
        </UForm>
      </template>
    </UStepper>
  </div>

  <!-- Non-stepper form (single step with fields) -->
  <div v-else-if="schema.fields && schema.fields.length > 0">
    <UForm
      ref="form"
      :state="formState"
      :schema="combinedSchema"
      class="space-y-4"
      @submit="handleSubmit"
    >
      <div
        v-for="field in schema.fields"
        :key="field.name"
        :class="{
          hidden: !isFieldVisible(field),
        }"
      >
        <!-- Input field -->
        <UFormField
          v-if="field.as === 'input'"
          :label="field.label"
          :name="field.name"
          :required="field.required"
          :ui="schema.ui"
        >
          <UInput
            v-model="formState[field.name]"
            :type="field.type"
            :placeholder="field.placeholder"
            :autocomplete="field.autocomplete"
            :disabled="isFieldDisabled(field)"
            :readonly="field.readonly"
            :ui="field.ui"
          />
        </UFormField>

        <!-- Textarea field -->
        <UFormField
          v-else-if="field.as === 'textarea'"
          :label="field.label"
          :name="field.name"
          :required="field.required"
          :ui="schema.ui"
        >
          <UTextarea
            v-model="formState[field.name]"
            :placeholder="field.placeholder"
            :autocomplete="field.autocomplete"
            :disabled="isFieldDisabled(field)"
            :readonly="field.readonly"
            :ui="field.ui"
          />
        </UFormField>

        <!-- Select field -->
        <UFormField
          v-else-if="field.as === 'select'"
          :label="field.label"
          :name="field.name"
          :required="field.required"
          :ui="schema.ui"
        >
          <USelect
            v-model="formState[field.name]"
            :items="getSelectOptions(field)"
            :placeholder="field.placeholder"
            :disabled="isFieldDisabled(field)"
            :ui="field.ui"
            @update:model-value="(value: any) => handleSelectChange(field.name, value)"
          />
        </UFormField>

        <!-- Radio field -->
        <UFormField
          v-else-if="field.as === 'radio' && field.items"
          :name="field.name"
          :required="field.required"
          :ui="schema.ui"
        >
          <URadioGroup
            v-model="formState[field.name]"
            :legend="field.label"
            :items="field.items"
            :color="field.color || 'primary'"
            :disabled="isFieldDisabled(field)"
            :ui="field.ui"
          />
        </UFormField>

        <!-- Checkbox field -->
        <UFormField
          v-else-if="field.as === 'checkbox'"
          :name="field.name"
          :required="field.required"
          :ui="schema.ui"
        >
          <UCheckbox
            v-model="formState[field.name]"
            :label="field.label"
            :disabled="isFieldDisabled(field)"
            :ui="field.ui"
          />
        </UFormField>
      </div>

      <div class="pt-4">
        <UButton
          type="submit"
          color="success"
          :loading="loading"
        >
          {{ buttonLabel }}
        </UButton>
      </div>
    </UForm>
  </div>
</template>
