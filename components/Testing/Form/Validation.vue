<script lang="ts" setup>
import { z } from 'zod'

const ZodLogin = z.object({
	email: z.string().email(),
	password: z.string().min(8)
})

const validationSchema = toTypedSchema(ZodLogin)
const { defineInputBinds, handleSubmit, errors, submitCount } = useForm({
	validationSchema
})

const email = defineInputBinds('email')
const password = defineInputBinds('password')

const tooManyAttempts = computed(() => {
	return submitCount.value >= 10
})

const onSubmit = handleSubmit((values) => {
	//
})
</script>

<template>
	<form id="logInForm" class="_form" name="logInForm" @submit="onSubmit">
		<div class="grid">
			<label class="text-primary-700 dark:text-primary-100 mb-2" for="email">{{
				$t('components.form.validation.email')
			}}</label>
			<div>
				<FormTextInput
					id="email"
					:bind="email"
					class="text-primary-700 dark:text-primary-100 mb-2"
					name="email"
					type="email"
					:placeholder="$t('components.form.validation.email')"
					autocomplete="email"
				/>
			</div>
			<span v-if="errors.email" class="text-primary-700 dark:text-primary-100">{{
				errors.email
			}}</span>
		</div>
		<div>
			<label class="text-primary-700 dark:text-primary-100 mb-2" for="password">{{
				$t('components.form.validation.password')
			}}</label>
			<div>
				<FormTextInput
					id="password"
					:bind="password"
					class="text-primary-700 dark:text-primary-100 mb-2"
					name="password"
					type="password"
					:placeholder="$t('components.form.validation.password')"
					autocomplete="current-password"
				/>
			</div>
			<span v-if="errors.password" class="text-primary-700 dark:text-primary-100">{{
				errors.password
			}}</span>
		</div>
		<MainButton v-if="!tooManyAttempts" type="button">
			{{ $t('components.form.validation.submit') }}
		</MainButton>
		<MainButton v-else type="button" disabled>
			{{ $t('components.form.validation.too_many_attempts') }}
		</MainButton>
	</form>
</template>
