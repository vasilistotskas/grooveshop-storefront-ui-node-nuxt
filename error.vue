<script lang="ts" setup>
import type { IFetchError } from 'ofetch'
import type { UseSeoMetaInput } from '@unhead/schema'
import Json404 from '~/assets/lotties/404.json'

defineProps({
	error: {
		type: Object as PropType<IFetchError | null>,
		required: false,
		default: null
	}
})

const colorMode = useColorMode()

const themeClass = computed(() => (colorMode.value === 'dark' ? 'dark' : 'light'))
const themeColor = computed(() => (colorMode.value === 'dark' ? '#1a202c' : '#ffffff'))
const handleError = () => clearError({ redirect: '/' })

const headOptions = {
	htmlAttrs: {
		class: () => themeClass.value
	}
}
const seoMetaOptions = {
	colorScheme: colorMode.value === 'dark' ? 'dark' : 'light',
	themeColor: themeColor.value,
	msapplicationTileColor: themeColor.value
} satisfies UseSeoMetaInput

useHead(headOptions)
useSeoMeta(seoMetaOptions)
</script>

<template>
	<div class="grid bg-zinc-100 dark:bg-zinc-900">
		<PageHeader>
			<PageNavbar />
		</PageHeader>
		<div class="grid min-h-screen">
			<div class="flex flex-col gap-2 items-center justify-center p-6">
				<h1
					class="grid gap-4 items-center justify-center justify-items-center text-xl text-primary-700 dark:text-primary-100 mb-2"
				>
					<strong class="text-5xl">{{ $t('pages.error.hmmm') }}</strong>
					<span>
						{{ $t('pages.error.page.not.found') }}
					</span>
				</h1>
				<p class="text-primary-700 dark:text-primary-100">
					{{ $t('pages.error.go.home') }}
				</p>
				<NuxtLink to="/" class="text-blue-500 hover:underline block mt-2 font-bold">
					{{ $t('pages.error.home') }}
				</NuxtLink>
				<Lottie
					class="grid mt-6"
					:animation-data="Json404"
					:width="'1500px'"
					:height="'600px'"
					:show-client-loading-animation="false"
				/>
			</div>
		</div>
		<div id="app-after">
			<slot name="app-after" />
		</div>
	</div>
</template>
