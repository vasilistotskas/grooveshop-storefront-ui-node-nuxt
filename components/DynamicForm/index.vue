<template>
	<UContainer class="mt-4">
		<UForm class="space-y-4" :state="fields" autocomplete="on" @submit="onSubmit">
			<UFormGroup
				v-for="{ as, name, label, autocomplete, children = [] } in schema.fields"
				:key="name"
				:label="label"
				:name="name"
				v-bind="fields[name].value"
			>
				<UInput
					:id="name"
					:as="as"
					:name="name"
					v-bind="fields[name].value"
					:autocomplete="autocomplete"
					class="grid gap-1"
				>
					<div v-if="children">
						<DynamicFormChildren :children="children" />
					</div>
				</UInput>
			</UFormGroup>
			<UButton :aria-busy="isSubmitting" :disabled="submitButtonDisabled" type="submit">{{
				buttonLabel
			}}</UButton>
			<UButton
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
import { useForm } from 'vee-validate'
import { PropType } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { DynamicFormFields, DynamicFormSchema, DynamicFormState } from '~/types/form'

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
	schema: {
		type: Object as PropType<DynamicFormSchema>,
		required: true
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

// Define the form bindings and validation rules using VeeValidate's useForm hook
const { defineComponentBinds, handleSubmit, resetForm, errors, isSubmitting } = useForm({
	validationSchema
})

// Create an object of field bindings using defineComponentBinds and nuxtUiConfig functions
function createFields(keys: string[]) {
	const fieldValues: DynamicFormFields<any, string, any> = {}
	keys.forEach((fieldName) => {
		fieldValues[fieldName] = defineComponentBinds(fieldName, nuxtUiConfig)
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
		Object.entries(fields).map(([key, value]) => [key, value.value.modelValue])
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
