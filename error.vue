<script lang="ts" setup>
import { IFetchError } from 'ofetch'

defineProps({
	error: {
		type: Object as PropType<IFetchError | null>,
		required: false,
		default: null
	}
})

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
	<div class="flex items-center justify-center min-h-screen bg-gray-100">
		<div class="bg-white p-6 rounded-lg shadow-md">
			<h1 class="text-2xl text-red-500 mb-2">{{ error?.message }}</h1>
			<p class="text-gray-600">{{ $t('pages.error.title') }}</p>
			<button
				class="bg-red-500 text-white px-4 py-2 rounded-md mt-4 hover:bg-red-600 transition duration-300"
				@click="handleError"
			>
				{{ $t('pages.error.clean') }}
			</button>
			<NuxtLink to="/" class="text-blue-500 hover:underline block mt-2">
				{{ $t('pages.error.home') }}
			</NuxtLink>
		</div>
	</div>
</template>
