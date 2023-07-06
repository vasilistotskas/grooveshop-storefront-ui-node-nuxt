<script lang="ts" setup>
import { PropType } from 'vue'
import { FetchError } from 'ofetch'

const PageWrapper = resolveComponent('PageWrapper') as string

const props = defineProps({
	error: {
		type: Object as PropType<FetchError | null>,
		required: false,
		default: null
	},
	code: {
		type: Number,
		default: 400
	},
	wrap: {
		type: Boolean,
		default: false
	}
})

const divTag = ref('div')
</script>

<template>
	<Component
		:is="wrap ? PageWrapper : divTag"
		:class="
			wrap
				? 'flex flex-col items-center justify-center'
				: 'grid items-center justify-center gap-4 bg-gray-100 dark:bg-slate-800 p-4 md:p-8 rounded-lg'
		"
	>
		<h1 v-if="!error">
			{{ $t('common.unknown.error') }}
		</h1>
		<h1 v-else class="grid gap-4 text-center leading-3 text-gray-700 dark:text-gray-200">
			<span class="text-gray-700 dark:text-gray-200 font-bold text-8xl block">{{
				error.statusCode
			}}</span>
			<span class="text-gray-700 dark:text-gray-200 block italic">{{
				error.statusMessage
			}}</span>
		</h1>
		<h2
			v-if="error?.data.detail"
			class="text-center text-sm text-gray-700 dark:text-gray-200"
		>
			( {{ error?.data.detail }} )
		</h2>
		<Button class="mt-4" text="Home" to="/" size="sm" />
	</Component>
</template>
