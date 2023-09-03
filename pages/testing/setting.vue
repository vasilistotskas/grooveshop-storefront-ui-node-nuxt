<script lang="ts" setup>
import {
	Tab as HeadlessUiTab,
	TabGroup,
	TabList,
	TabPanel,
	TabPanels
} from '@headlessui/vue'
import { Size } from '~/composables/useScreen'

definePageMeta({
	layout: 'testing'
})

const screen = useScreen()
const config = useRuntimeConfig()
const randomToken = () => {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	let token = ''
	for (let i = 0; i < 255; i++) {
		token += chars.charAt(Math.floor(Math.random() * chars.length))
	}
	return token
}

const username = ref(config.public.author.name)
const id = ref(randomToken())
const enableSpamProtection = ref(false)
const enableDirList = ref(false)
const enableAdvancedSetting = ref(false)
const validate = async () => {
	try {
		const response = await fetch(`https://api.github.com/users/${username.value}`)
		if (response.status !== 200)
			throw new Error(
				`error when fetching username : ${response.statusText} (${response.status})`
			)
		const data = (await response.json()) as {
			name: string
			id: string
		}
		alert(`Found Account Name ${data.name} with id : ${data.id}`)
	} catch (err) {
		alert(err)
	}
}
</script>

<template>
	<PageWrapper class="container mt-1 min-h-full">
		<PageSection class="mb-0">
			<Alert
				type="success"
				title="This is a page for testing purposes"
				text="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
				class="mb-6"
			/>
		</PageSection>
		<PageHeader>
			<PageTitle :text="$t('pages.testing.setting.title')" class="capitalize" />
		</PageHeader>
		<PageBody>
			<PageSection>
				<TabGroup
					as="div"
					class="flex flex-col md:flex-row md:space-x-4"
					:vertical="screen.higherThan(Size.MEDIUM)"
				>
					<TabList class="w-full md:w-1/6 flex md:flex-col rounded-lg mb-2">
						<HeadlessUiTab v-slot="{ selected }" as="template">
							<button
								type="button"
								:class="[
									'md:w-full text-left px-3 py-1.5 rounded py-2.5 text-sm leading-5 transition-all hover:bg-gray-200 hover:text-slate-900 dark:hover:bg-white/[0.12] dark:hover:text-white',
									selected
										? 'font-extrabold text-primary-400'
										: 'text-gray-700 dark:text-gray-200'
								]"
							>
								General
							</button>
						</HeadlessUiTab>
						<HeadlessUiTab v-slot="{ selected }" as="template">
							<button
								type="button"
								:class="[
									'md:w-full text-left px-3 py-1.5 rounded py-2.5 text-sm leading-5 transition-all hover:bg-gray-200 hover:text-slate-900 dark:hover:bg-white/[0.12] dark:hover:text-white',
									selected
										? 'font-extrabold text-primary-400'
										: 'text-gray-700 dark:text-gray-200'
								]"
							>
								Protection
							</button>
						</HeadlessUiTab>
						<HeadlessUiTab v-slot="{ selected }" as="template">
							<button
								type="button"
								:class="[
									'md:w-full text-left px-3 py-1.5 rounded py-2.5 text-sm leading-5 transition-all hover:bg-gray-200 hover:text-slate-900 dark:hover:bg-white/[0.12] dark:hover:text-white',
									selected
										? 'font-extrabold text-primary-400'
										: 'text-gray-700 dark:text-gray-200'
								]"
							>
								Advanced
							</button>
						</HeadlessUiTab>
					</TabList>
					<TabPanels class="flex-1">
						<TabPanel>
							<Card class="mb-4">
								<CardContent>
									<CardTitle
										class="capitalize"
										:text="$t('pages.testing.setting.sections.validate_username.title')"
									/>
									<p class="text-gray-700 dark:text-gray-200 mb-2">
										{{
											$t('pages.testing.setting.sections.validate_username.description')
										}}
									</p>
									<div class="flex">
										<FormTextInput
											:id="'username'"
											v-model="username"
											:name="'username'"
											class="w-full md:w-1/3"
										>
											<template #prefix-disabled>
												<span class="flex-1 px-4 py-2 text-gray-700 dark:text-gray-200"
													>github.com/</span
												>
											</template>
										</FormTextInput>
									</div>
								</CardContent>
								<CardFooter
									class="flex flex-col space-y-2 md:space-y md:flex-row items-center md:justify-between"
								>
									<p class="text-gray-700 dark:text-gray-200">
										{{ $t('pages.testing.setting.sections.validate_username.footer') }}
										<Anchor
											class="underline font-bold capitalize"
											:text="
												$t('pages.testing.setting.sections.validate_username.footer_link')
											"
											href="https://docs.github.com/en/rest/users/users#get-a-user"
										/>
									</p>
									<Button
										class="capitalize"
										size="sm"
										type="button"
										:style="'opposite'"
										:text="
											$t('pages.testing.setting.sections.validate_username.footer_button')
										"
										@click="validate"
									/>
								</CardFooter>
							</Card>
							<Card class="mb-4">
								<CardContent>
									<CardTitle
										class="capitalize"
										:text="$t('pages.testing.setting.sections.bot_id.title')"
									/>
									<p class="text-gray-700 dark:text-gray-200 mb-2">
										{{ $t('pages.testing.setting.sections.bot_id.description') }}
									</p>
									<div class="flex">
										<FormTextInput
											:id="'id'"
											v-model="id"
											:name="'id'"
											class="w-full md:w-1/3"
										>
											<template #suffix>
												<Button
													type="button"
													:style="'opposite'"
													class="space-x-1 border-none"
												>
													<IconIc:baselineContentCopy />
													{{ $t('common.copy') }}
												</Button>
											</template>
										</FormTextInput>
									</div>
								</CardContent>
								<CardFooter class="justify-between">
									<p class="text-gray-700 dark:text-gray-200">
										{{ $t('pages.testing.setting.sections.bot_id.footer') }}
									</p>
								</CardFooter>
							</Card>
						</TabPanel>
						<TabPanel>
							<Card
								:class="{
									'mb-4': true,
									'border-red-500 dark:border-red-500': !enableSpamProtection
								}"
							>
								<CardContent>
									<CardTitle
										class="capitalize"
										:text="$t('pages.testing.setting.sections.protection_spam.title')"
									/>
									<p class="text-gray-700 dark:text-gray-200 mb-2">
										{{ $t('pages.testing.setting.sections.protection_spam.description') }}
									</p>
									<div class="flex">
										<FormSwitch v-model="enableSpamProtection">
											<span class="capitalize text-gray-700 dark:text-gray-200">{{
												enableSpamProtection
													? $t('common.enabled')
													: $t('common.disabled')
											}}</span>
										</FormSwitch>
									</div>
								</CardContent>
								<CardFooter class="justify-between">
									<p class="text-gray-700 dark:text-gray-200">
										{{ $t('pages.testing.setting.sections.protection_spam.footer') }}
									</p>
								</CardFooter>
							</Card>
						</TabPanel>
						<TabPanel>
							<Card class="mb-4">
								<CardContent>
									<CardTitle
										class="capitalize"
										:text="
											$t('pages.testing.setting.sections.advanced_enable_advanced.title')
										"
									/>
									<p class="text-gray-700 dark:text-gray-200 mb-2">
										{{
											$t(
												'pages.testing.setting.sections.advanced_enable_advanced.description'
											)
										}}
									</p>
									<div class="flex">
										<FormSwitch v-model="enableAdvancedSetting">
											<span class="capitalize text-gray-700 dark:text-gray-200">{{
												enableAdvancedSetting
													? $t('common.enabled')
													: $t('common.disabled')
											}}</span>
										</FormSwitch>
									</div>
								</CardContent>
							</Card>
							<Card class="mb-4" :disabled="!enableAdvancedSetting">
								<CardContent>
									<CardTitle
										class="capitalize"
										:text="
											$t('pages.testing.setting.sections.advanced_dir_listing.title')
										"
									/>
									<p class="text-gray-700 dark:text-gray-200 mb-2">
										{{
											$t(
												'pages.testing.setting.sections.advanced_dir_listing.description'
											)
										}}
									</p>
									<div class="flex">
										<FormSwitch v-model="enableDirList" on>
											<span class="capitalize text-gray-700 dark:text-gray-200">{{
												enableDirList ? $t('common.enabled') : $t('common.disabled')
											}}</span>
										</FormSwitch>
									</div>
								</CardContent>
							</Card>
						</TabPanel>
					</TabPanels>
				</TabGroup>
			</PageSection>
		</PageBody>
	</PageWrapper>
</template>
