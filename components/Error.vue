<script lang="ts" setup>
import type { PropType } from 'vue'
import type { IFetchError } from 'ofetch'

const PageWrapper = resolveComponent('PageWrapper') as string

defineProps({
	error: {
		type: Object as PropType<IFetchError | null>,
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
				: 'grid items-center justify-center gap-4 bg-zinc-100 dark:bg-zinc-800 p-4 md:p-8 rounded-lg'
		"
	>
		<h1 v-if="!error">
			{{ $t('common.unknown.error') }}
		</h1>
		<h1
			v-else
			class="grid gap-4 text-center leading-3 text-primary-700 dark:text-primary-100"
		>
			<span class="text-primary-700 dark:text-primary-100 font-bold text-8xl block">{{
				error.statusCode
			}}</span>
			<span class="text-primary-700 dark:text-primary-100 block italic">{{
				error.statusMessage
			}}</span>
		</h1>
		<h2
			v-if="error?.data.detail"
			class="text-center text-sm text-primary-700 dark:text-primary-100"
		>
			( {{ error?.data.detail }} )
		</h2>
		<MainButton class="mt-4" text="Home" to="/" size="sm" />
	</Component>
</template>
