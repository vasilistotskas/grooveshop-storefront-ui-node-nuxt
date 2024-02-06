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
				: 'grid items-center justify-center gap-4 rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800 md:p-8'
		"
	>
		<h1 v-if="!error">
			{{ $t('common.unknown.error') }}
		</h1>
		<h1
			v-else
			class="text-primary-700 dark:text-primary-100 grid gap-4 text-center leading-3"
		>
			<span class="text-primary-700 dark:text-primary-100 block text-8xl font-bold">{{
				error.statusCode
			}}</span>
			<span class="text-primary-700 dark:text-primary-100 block italic">{{
				error.statusMessage
			}}</span>
		</h1>
		<h2
			v-if="error?.data.detail"
			class="text-primary-700 dark:text-primary-100 text-center text-sm"
		>
			( {{ error?.data.detail }} )
		</h2>
		<UButton class="mt-4" :label="$t('common.home')" :to="'/'" size="sm" color="white" />
	</Component>
</template>
