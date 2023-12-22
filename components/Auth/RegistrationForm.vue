<script lang="ts" setup>
import { z } from 'zod'

const { register } = useAuth()

const userStore = useUserStore()
const cartStore = useCartStore()

const { fetchAccount } = userStore
const { fetchCart } = cartStore

const { t } = useI18n()
const toast = useToast()

const ZodRegistration = z
	.object({
		email: z.string().email(),
		password1: z.string().min(8, {
			message: t('pages.auth.registration.form.password1.validation.min', {
				min: 8
			})
		}),
		password2: z.string().min(8, {
			message: t('pages.auth.registration.form.password2.validation.min', {
				min: 8
			})
		})
	})
	.refine((data) => data.password1 === data.password2, {
		message: t('pages.auth.registration.form.password2.validation.match'),
		path: ['password2']
	})

const validationSchema = toTypedSchema(ZodRegistration)

const { defineField, handleSubmit, errors, isSubmitting } = useForm({
	validationSchema
})

const [email, emailProps] = defineField('email', {
	validateOnModelUpdate: true
})
const [password1, password1Props] = defineField('password1', {
	validateOnModelUpdate: true
})
const [password2, password2Props] = defineField('password2', {
	validateOnModelUpdate: true
})

const showPassword1 = ref(false)
const showPassword2 = ref(false)

const onSubmit = handleSubmit(async (values) => {
	const { data, error } = await register({
		email: values.email,
		password1: values.password1,
		password2: values.password2
	})
	if (data.value?.user) {
		toast.add({
			title: t('common.auth.registration.success')
		})
		await fetchAccount()
		await fetchCart()
	} else if (data.value?.detail) {
		toast.add({
			title: data.value?.detail
		})
	} else if (error.value) {
		if (error.value?.data.data?.email) {
			toast.add({
				title: error.value?.data.data?.email[0],
				color: 'red'
			})
		}
		toast.add({
			title: t('common.auth.registration.error'),
			color: 'red'
		})
		clearNuxtData('register')
	}
})
</script>

<template>
	<section class="grid">
		<form
			id="RegistrationForm"
			class="container-xs p-0 md:px-6"
			name="RegistrationForm"
			@submit.prevent="onSubmit"
		>
			<div
				class="p-4 md:p-8 flex h-full flex-wrap items-center justify-center lg:justify-between bg-white dark:bg-zinc-800 border border-gray-900/10 dark:border-gray-50/[0.2] rounded-[0.5rem] shadow-[0_4px_9px_-4px_#0000000d] dark:shadow-[0_4px_9px_-4px_#0000000d]"
			>
				<div class="relative grid gap-4 w-full">
					<div class="grid content-evenly items-start">
						<label class="text-primary-700 dark:text-primary-100" for="email">{{
							$t('pages.auth.registration.form.email.label')
						}}</label>
						<FormTextInput
							id="email"
							v-model="email"
							:bind="emailProps"
							class="text-primary-700 dark:text-primary-100"
							name="email"
							type="email"
							autocomplete="email"
							:required="true"
						/>
						<span v-if="errors.email" class="text-sm text-red-600 px-4 py-3 relative">{{
							errors.email
						}}</span>
					</div>

					<div class="grid content-evenly items-start">
						<label class="text-primary-700 dark:text-primary-100" for="password1">{{
							$t('pages.auth.registration.form.password1.label')
						}}</label>
						<div class="relative grid gap-2 items-center">
							<FormTextInput
								id="password1"
								v-model="password1"
								:bind="password1Props"
								class="text-primary-700 dark:text-primary-100"
								name="password1"
								:type="showPassword1 ? 'text' : 'password'"
								autocomplete="current-password"
								:required="true"
							/>
							<button
								type="button"
								class="absolute right-2 top-1/2 transform -translate-y-1/2"
								:aria-label="$t('pages.auth.registration.form.password1.show')"
								@click="showPassword1 = !showPassword1"
							>
								<IconFa6Solid:eye v-if="!showPassword1" />
								<IconFa6Solid:eyeSlash v-else />
							</button>
						</div>
						<span
							v-if="errors.password1"
							class="text-sm text-red-600 px-4 py-3 relative"
							>{{ errors.password1 }}</span
						>
					</div>

					<div class="grid content-evenly items-start">
						<label class="text-primary-700 dark:text-primary-100" for="password2">{{
							$t('pages.auth.registration.form.password2.label')
						}}</label>
						<div class="relative grid gap-2 items-center">
							<FormTextInput
								id="password2"
								v-model="password2"
								:bind="password2Props"
								class="text-primary-700 dark:text-primary-100"
								name="password2"
								:type="showPassword2 ? 'text' : 'password'"
								autocomplete="current-password"
								:required="true"
							/>
							<button
								type="button"
								class="absolute right-2 top-1/2 transform -translate-y-1/2"
								:aria-label="$t('pages.auth.registration.form.password2.show')"
								@click="showPassword2 = !showPassword2"
							>
								<IconFa6Solid:eye v-if="!showPassword2" />
								<IconFa6Solid:eyeSlash v-else />
							</button>
						</div>
						<span
							v-if="errors.password2"
							class="text-sm text-red-600 px-4 py-3 relative"
							>{{ errors.password2 }}</span
						>
					</div>

					<button
						type="submit"
						class="inline-block w-full rounded bg-primary px-7 pb-2.5 pt-3 text-sm font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
						:disabled="isSubmitting"
						:aria-busy="isSubmitting"
					>
						{{ $t('pages.auth.registration.form.submit') }}
					</button>

					<div class="flex gap-2 items-center justify-end">
						<span class="text-sm text-primary-700 dark:text-primary-100">{{
							$t('pages.auth.registration.form.already_have_account')
						}}</span>
						<Anchor
							class="text-base hover:no-underline hover:text-slate-900 hover:dark:text-white text-[1.5rem] flex self-center items-center"
							:title="$t('pages.auth.login.title')"
							:text="$t('pages.auth.login.title')"
							:to="'/auth/login'"
						/>
					</div>
				</div>
			</div>
		</form>
	</section>
</template>
