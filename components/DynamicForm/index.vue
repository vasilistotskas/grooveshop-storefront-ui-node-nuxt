<template>
	<UContainer>
		<UForm
			:id="id"
			class="w-full space-y-4"
			:state="fields"
			autocomplete="on"
			@submit="onSubmit"
		>
			<div v-if="isMultiStep" class="grid items-center justify-center">
				<span class="font-semibold text-xl">{{ schema.steps?.[currentStep].title }}</span>
			</div>

			<UFormGroup
				v-for="{
					as,
					name,
					label,
					autocomplete = 'off',
					readonly = false,
					required = false,
					placeholder = '',
					type = 'text',
					children = []
				} in filteredFields"
				:key="name"
				v-model="fields[name][0].value"
				:label="label"
				:name="name"
				v-bind="fields[name][1].value"
			>
				<label v-if="as === 'input'" :for="name" class="sr-only">{{ label }}</label>
				<UInput
					v-bind="fields[name][1].value"
					:id="name"
					v-model="fields[name][0].value"
					:as="as"
					:name="name"
					:autocomplete="autocomplete"
					:aria-readonly="readonly"
					:readonly="readonly"
					:required="required"
					:placeholder="
						type === 'text' || type === 'password' || type === 'email' ? placeholder : ''
					"
					:type="type"
					:disabled="disabledFields[name]"
					class="grid gap-1"
				>
					<div v-if="children">
						<LazyDynamicFormChildren :children="children" />
					</div>
				</UInput>
			</UFormGroup>

			<div
				v-if="isMultiStep"
				:class="[currentStep === lastStep ? 'justify-between' : 'justify-end', 'flex']"
			>
				<UButton
					v-if="currentStep > 0"
					icon="i-heroicons-arrow-long-left"
					@click="goToPreviousStep"
					>{{ $t('common.previous') }}</UButton
				>
				<UButton
					v-if="currentStep < lastStep"
					icon="i-heroicons-arrow-long-right"
					:disabled="nextStepButtonDisabled"
					@click="goToNextStep"
					>{{ $t('common.next') }}</UButton
				>
				<UButton v-if="currentStep === lastStep" type="submit">{{ buttonLabel }}</UButton>
			</div>

			<UButton
				v-else-if="submitButton"
				:aria-busy="isSubmitting"
				:disabled="submitButtonDisabled"
				type="submit"
				>{{ buttonLabel }}</UButton
			>
			<UButton
				v-else-if="resetButton"
				class="ml-4"
				color="white"
				variant="outline"
				type="button"
				@click="resetForm()"
			>
				{{ resetLabel }}
			</UButton>
		</UForm>
	</UContainer>
</template>

<script lang="ts" setup>
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import type { ValidationOptions } from 'vee-validate'
import type {
	DisabledFields,
	DynamicFormFields,
	DynamicFormSchema,
	DynamicFormState,
	FormValues
} from '~/types/form'

// Define the UI configuration for Nuxt-UI
const nuxtUiConfig = (state: DynamicFormState) => {
	return {
		props: {
			error: state.errors[0]
		}
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
	}>(),
	{
		id: uuidv4(),
		submitButton: true,
		resetButton: false,
		buttonLabel: 'Submit',
		resetLabel: 'Reset',
		disableSubmitUntilValid: true
	}
)

const isMultiStep = computed(
	() => Array.isArray(props.schema.steps) && props.schema.steps.length > 0
)

const currentStep = ref(0)
const lastStep = props.schema.steps?.length ? props.schema.steps?.length - 1 : 0

// Filter the schema fields based on the current step
const formFields = computed(() => {
	return (
		(isMultiStep.value
			? props.schema.steps?.[currentStep.value].fields
			: props.schema.fields) ?? []
	)
})

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
		acc[field.name] = field.disabledCondition
			? field.disabledCondition(formState.value)
			: false
		return acc
	}, {})
})

// Create an array of field names from the schema object
const schemaFieldNames = computed(() => {
	return formFields.value.map((field) => field.name)
})

// Use schema.fields to generate a Zod schema object
const generatedSchema = z.object(
	Object.fromEntries(formFields.value.map((field) => [field.name, field.rules]))
)

// Convert the generated Zod schema object to a VeeValidate compatible schema object
const validationSchema = toTypedSchema(generatedSchema)

// Create an object of initial form values from the schema object
const initialFormValues = formFields.value.reduce((acc: FormValues, field) => {
	acc[field.name] = field.initialValue
	return acc
}, {})

// Define the form bindings and validation rules using VeeValidate's useForm hook
const { defineField, handleSubmit, resetForm, errors, isSubmitting, validate, values } =
	useForm({
		validationSchema,
		initialValues: initialFormValues,
		keepValuesOnUnmount: isMultiStep.value
	})

const goToNextStep = async () => {
	const currentStepFields = props.schema.steps?.[currentStep.value].fields ?? []
	const fieldsToValidate = currentStepFields.map(
		(field) => field.name
	) as Partial<ValidationOptions>
	const isValid = await validate(fieldsToValidate).then((result) => result.valid)
	if (isValid) {
		if (currentStep.value < lastStep) {
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

const fields = computed(() => {
	return createFields(schemaFieldNames.value)
})

// Define the submit event emitter using defineEmits function
const emit = defineEmits(['submit'])

// Define the submit event handler using handleSubmit function and emit function
const onSubmit = handleSubmit(() => {
	emit('submit', values)
})

// Define the form state for Nuxt UI
const formState = computed(() => {
	return Object.fromEntries(
		Object.entries(fields.value).map(([key, value]) => [key, value[0].value])
	)
})

// Define the submit button disabled state
const submitButtonDisabled = computedAsync(async () => {
	return await validationSchema
		.parse(formState.value)
		.then((result) => {
			const liveResultValid = result.errors.length === 0
			return isSubmitting.value ||
				Object.keys(errors.value).length > 0 ||
				props.disableSubmitUntilValid
				? !liveResultValid
				: false
		})
		.catch(() => {
			return true
		})
}, props.disableSubmitUntilValid)

const nextStepButtonDisabled = computed(() => {
	return (
		isSubmitting.value ||
		Object.keys(errors.value).length > 0 ||
		props.disableSubmitUntilValid
	)
})

// Watch for changes to the disabledFields object
formFields.value.forEach((field) => {
	watch(
		() => disabledFields.value?.[field.name],
		(newVal, oldVal) => {
			if (newVal && !oldVal) {
				fields.value[field.name][0].value = ''
			}
		}
	)
})
</script>
