<template>
	<UContainer class="mt-4">
		<UForm
			:id="id"
			class="space-y-4"
			:state="fields"
			autocomplete="on"
			@submit="onSubmit"
		>
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
				} in schema.fields"
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
					class="grid gap-1"
				>
					<div v-if="children">
						<LazyDynamicFormChildren :children="children" />
					</div>
				</UInput>
			</UFormGroup>
			<UButton
				v-if="submitButton"
				:aria-busy="isSubmitting"
				:disabled="submitButtonDisabled"
				type="submit"
				>{{ buttonLabel }}</UButton
			>
			<UButton
				v-if="resetButton"
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
import type { PropType } from 'vue'
import type {
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
const props = defineProps({
	id: {
		type: String,
		required: false,
		default: () => uuidv4()
	},
	schema: {
		type: Object as PropType<DynamicFormSchema>,
		required: true
	},
	submitButton: {
		type: Boolean,
		default: true
	},
	resetButton: {
		type: Boolean,
		default: false
	},
	buttonLabel: {
		type: String,
		default: 'Submit'
	},
	resetLabel: {
		type: String,
		default: 'Reset'
	},
	disableSubmitUntilValid: {
		type: Boolean,
		default: false
	}
})

// Create an array of field names from the schema object
const schemaFieldNames = props.schema.fields.map((field) => field.name)

// Use schema.fields to generate a Zod schema object
const generatedSchema = z.object(
	Object.fromEntries(props.schema.fields.map((field) => [field.name, field.rules]))
)

// Convert the generated Zod schema object to a VeeValidate compatible schema object
const validationSchema = toTypedSchema(generatedSchema)

// Create an object of initial form values from the schema object
const initialFormValues = props.schema.fields.reduce((acc: FormValues, field) => {
	acc[field.name] = field.initialValue
	return acc
}, {})

// Define the form bindings and validation rules using VeeValidate's useForm hook
const { defineField, handleSubmit, resetForm, errors, isSubmitting } = useForm({
	validationSchema,
	initialValues: initialFormValues
})

// Create an object of field bindings using defineField and nuxtUiConfig functions
function createFields(keys: string[]) {
	const fieldValues: DynamicFormFields = {}
	keys.forEach((key) => {
		// Use defineField for each key and store the result in fieldValues
		const [field, fieldProps] = defineField(key, nuxtUiConfig)
		fieldValues[key] = [field, fieldProps]
	})
	return fieldValues
}
const fields = createFields(schemaFieldNames)

// Define the submit event emitter using defineEmits function
const emit = defineEmits(['submit'])

// Define the submit event handler using handleSubmit function and emit function
const onSubmit = handleSubmit((values) => {
	emit('submit', values)
})

// Define the form state for Nuxt UI
const state = computed(() => {
	return Object.fromEntries(
		Object.entries(fields).map(([key, value]) => [key, value[0].value])
	)
})

// Define the submit button disabled state
const submitButtonDisabled = computedAsync(async () => {
	return await validationSchema
		.parse(state.value)
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
}, !!props.disableSubmitUntilValid)
</script>
