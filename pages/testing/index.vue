<script lang="ts" setup>
import { z } from 'zod'
import type { WebsocketMessageData } from '~/types/websocket'
import type { DynamicFormSchema } from '~/types/form'

const config = useRuntimeConfig()

const formSchema: DynamicFormSchema = {
	fields: [
		{
			label: 'Your Name',
			name: 'name',
			as: 'input',
			rules: z.string().min(2),
			autocomplete: 'given-name',
			readonly: false,
			required: false,
			placeholder: 'John Doe',
			type: 'text',
			initialValue: 'John Doe 2',
			children: [
				{
					tag: 'span',
					text: 'This is a span',
					as: 'span'
				}
			]
		},
		{
			label: 'Your Email',
			name: 'email',
			as: 'input',
			rules: z.string().email(),
			autocomplete: 'email',
			readonly: false,
			required: true,
			placeholder: 'test@test.gr',
			type: 'email',
			children: [
				{
					tag: 'span',
					text: 'This is a span',
					as: 'span'
				}
			]
		},
		{
			label: 'Your Password',
			name: 'password',
			as: 'input',
			type: 'password',
			rules: z.string().min(8),
			autocomplete: 'new-password',
			readonly: false,
			required: true,
			placeholder: '********'
		},
		{
			label: 'Your OTP',
			name: 'otp',
			as: 'input',
			type: 'number',
			rules: z.number().min(6),
			autocomplete: 'one-time-code',
			readonly: false,
			required: false,
			placeholder: '123456'
		},
		{
			label: 'Your Birthdate',
			name: 'birthdate',
			as: 'input',
			type: 'date',
			rules: z.string().min(8),
			autocomplete: 'bday',
			readonly: false,
			required: true,
			placeholder: '01/01/2000'
		}
	]
}

function onSubmit(values: any) {
	window.alert(JSON.stringify(values, null, 2))
}

const ZodLogin = z.object({
	email: z.string().email(),
	password: z.string().min(6)
})

const validationSchema = toTypedSchema(ZodLogin)

const { defineField, errors } = useForm({
	validationSchema,
	validateOnMount: true
})

const [email, emailProps] = defineField('email', { validateOnModelUpdate: true })
const [password, passwordProps] = defineField('password', { validateOnModelUpdate: true })

let ws: WebSocket
onMounted(() => {
	const websocketProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
	const djangoApiHost = config.public.djangoHost
	const wsEndpoint = `${websocketProtocol}://${djangoApiHost}/ws/notifications/`

	const { status, data, send, open, close } = useWebSocket(wsEndpoint)
	ws = new WebSocket(wsEndpoint)
	ws.onmessage = (event: MessageEvent<WebsocketMessageData>) => {
		// eslint-disable-next-line no-console
		console.log(
			'event',
			event,
			event.data.users,
			event.data.isRead,
			event.data.link,
			event.data.kind,
			event.data.translations
		)
	}

	ws.onopen = (event) => {
		// eslint-disable-next-line no-console
		console.log('WebSocket connection opened!', event)
	}

	ws.onclose = (event) => {
		// eslint-disable-next-line no-console
		console.log('WebSocket connection closed!', event)
	}
})
const sendMessage = () => {
	ws.send('hello')
}

definePageMeta({
	layout: 'testing'
})
</script>

<template>
	<PageWrapper class="container min-h-full">
		<PageHeader>
			<PageTitle :text="$t('pages.testing.index.title')" class="capitalize" />
		</PageHeader>
		<PageBody>
			<PageSection>
				<p class="text-primary-700 dark:text-primary-100">
					Lorem ipsum dolor sit amet consectetur adipisicing elit. Quia autem debitis ab
					dolorum tempore placeat possimus perferendis porro sit aut nobis quasi hic
					consequuntur, atque impedit nihil totam illo odit?
				</p>
			</PageSection>
			<div class="grid grid-cols-2">
				<DynamicForm :schema="formSchema" @submit="onSubmit" />

				<form
					id="testForm"
					ref="testForm"
					name="testForm"
					class="grid p-4"
					@submit="onSubmit"
				>
					<div
						class="p-4 md:p-8 flex h-full flex-wrap items-center justify-center lg:justify-between bg-white dark:bg-zinc-800 border border-gray-900/10 dark:border-gray-50/[0.2] rounded-[0.5rem] shadow-[0_4px_9px_-4px_#0000000d] dark:shadow-[0_4px_9px_-4px_#0000000d]"
					>
						<div class="relative grid gap-4 w-full">
							<div class="grid content-evenly items-start">
								<label class="text-primary-700 dark:text-primary-100" for="email">{{
									$t('pages.auth.login.form.email.label')
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
								<span
									v-if="errors.email"
									class="text-sm text-red-600 px-4 py-3 relative"
									>{{ errors.email }}</span
								>
							</div>

							<div class="grid content-evenly items-start">
								<label class="text-primary-700 dark:text-primary-100" for="password">{{
									$t('pages.auth.login.form.password.label')
								}}</label>
								<div class="relative grid gap-2 items-center">
									<FormTextInput
										id="password"
										v-model="password"
										:bind="passwordProps"
										class="text-primary-700 dark:text-primary-100"
										name="password"
										:type="password"
										autocomplete="current-password"
										:required="true"
									/>
									<button
										type="button"
										class="absolute right-2 top-1/2 transform -translate-y-1/2"
									></button>
								</div>
								<span
									v-if="errors.password"
									class="text-sm text-red-600 px-4 py-3 relative"
									>{{ errors.password }}</span
								>
							</div>

							<div class="flex items-center justify-between">
								<div class="0.125rem] block min-h-[1.5rem] pl-[1.5rem]">
									<input
										id="checkbox"
										class="relative float-left -ml-[1.5rem] mr-[6px] h-[1.125rem] w-[1.125rem] appearance-none rounded-[0.25rem] border-[0.125rem] border-solid border-neutral-300 outline-none before:pointer-events-none before:absolute before:h-[0.875rem] before:w-[0.875rem] before:scale-0 before:rounded-full before:bg-transparent before:opacity-0 before:shadow-[0px_0px_0px_13px_transparent] before:content-[''] checked:border-primary checked:bg-primary checked:before:opacity-[0.16] checked:after:absolute checked:after:-mt-px checked:after:ml-[0.25rem] checked:after:block checked:after:h-[0.8125rem] checked:after:w-[0.375rem] checked:after:rotate-45 checked:after:border-[0.125rem] checked:after:border-l-0 checked:after:border-t-0 checked:after:border-solid checked:after:border-white checked:after:bg-transparent checked:after:content-[''] hover:cursor-pointer hover:before:opacity-[0.04] hover:before:shadow-[0px_0px_0px_13px_rgba(0,0,0,0.6)] focus:shadow-none focus:transition-[border-color_0.2s] focus:before:scale-100 focus:before:opacity-[0.12] focus:before:shadow-[0px_0px_0px_13px_rgba(0,0,0,0.6)] focus:before:transition-[box-shadow_0.2s,transform_0.2s] focus:after:absolute focus:after:z-[1] focus:after:block focus:after:h-[0.875rem] focus:after:w-[0.875rem] focus:after:rounded-[0.125rem] focus:after:content-[''] checked:focus:before:scale-100 checked:focus:before:shadow-[0px_0px_0px_13px_#3b71ca] checked:focus:before:transition-[box-shadow_0.2s,transform_0.2s] checked:focus:after:-mt-px checked:focus:after:ml-[0.25rem] checked:focus:after:h-[0.8125rem] checked:focus:after:w-[0.375rem] checked:focus:after:rotate-45 checked:focus:after:rounded-none checked:focus:after:border-[0.125rem] checked:focus:after:border-l-0 checked:focus:after:border-t-0 checked:focus:after:border-solid checked:focus:after:border-white checked:focus:after:bg-transparent dark:border-neutral-600 dark:checked:border-primary dark:checked:bg-primary dark:focus:before:shadow-[0px_0px_0px_13px_rgba(255,255,255,0.4)] dark:checked:focus:before:shadow-[0px_0px_0px_13px_#3b71ca]"
										type="checkbox"
										value=""
										checked
									/>
									<label
										class="inline-block pl-[0.15rem] hover:cursor-pointer"
										for="checkbox"
									>
										{{ $t('pages.auth.login.form.remember') }}
									</label>
								</div>
							</div>

							<button
								type="submit"
								class="inline-block w-full rounded bg-primary px-7 pb-2.5 pt-3 text-sm font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
							>
								{{ $t('pages.auth.login.form.submit') }}
							</button>
						</div>
					</div>
				</form>
			</div>
		</PageBody>
	</PageWrapper>
</template>
