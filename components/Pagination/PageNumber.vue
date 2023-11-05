<script lang="ts" setup>
import type { PropType } from 'vue'
import type { Pagination } from '~/types/pagination/pagination'

const props = defineProps({
	count: {
		type: Number,
		required: true,
		default: 0
	},
	totalPages: {
		type: Number,
		required: true,
		default: 1
	},
	pageTotalResults: {
		type: Number,
		required: true,
		default: 0
	},
	pageSize: {
		type: Number,
		required: true,
		default: 10
	},
	page: {
		type: Number,
		required: true,
		default: 1
	},
	links: {
		type: Object as PropType<Pagination<unknown>['links']>,
		required: true
	},
	maxVisibleButtons: {
		type: Number,
		required: false,
		default: 3
	}
})

const route = useRoute()

const firstPageNumber = computed(() => 1)
const lastPageNumber = computed(() => props.totalPages)
const startPage = computed(() => {
	if (props.page === 1) {
		return 1
	}
	if (props.page === props.totalPages) {
		if (props.totalPages - props.maxVisibleButtons + 1 === 0) {
			return 1
		}
		return props.totalPages - props.maxVisibleButtons + 1
	}
	return props.page - 1
})

const isInFirstPage = computed(() => props.page === 1)
const isInLastPage = computed(() => props.page === props.totalPages)

const shouldDisplayFirstPage = computed(() => {
	return !isInFirstPage.value && props.page > firstPageNumber.value + 1
})
const shouldDisplayLastPage = computed(() => {
	return !isInLastPage.value && props.page < lastPageNumber.value - 1
})
const shouldDisplayPreviousTripleDots = computed(() => {
	return props.page > props.maxVisibleButtons
})
const shouldDisplayNextTripleDots = computed(() => {
	return props.page < props.totalPages - props.maxVisibleButtons + 1
})

const pages = computed(() => {
	const range = []
	let lastPageNumber: number
	if (props.totalPages < props.maxVisibleButtons) {
		lastPageNumber = props.totalPages || 1
	} else {
		lastPageNumber = Math.min(
			startPage.value + props.maxVisibleButtons - 1,
			props.totalPages || 1
		)
	}
	const startPageNumber = isInLastPage.value ? startPage.value - 1 : startPage.value
	for (let i = startPageNumber; i <= lastPageNumber; i += 1) {
		if (i === 0) continue
		range.push(i)
	}

	if (props.maxVisibleButtons === range.length) {
		if (isInFirstPage.value) {
			range.pop()
		}
		if (isInLastPage.value) {
			range.shift()
		}
	}

	return range
})

const link = computed(() => {
	return route.path
})
</script>

<template>
	<div class="pagination relative">
		<ol
			v-if="totalPages > 1"
			class="pagination-ordered-list w-full flex md:grid items-center gap-4"
		>
			<li class="previous-page">
				<Anchor
					:to="{
						path: link,
						query: {
							page: page - 1,
							ordering: route.query?.ordering
						}
					}"
					:class="{
						disabled: isInFirstPage,
						active: isInFirstPage
					}"
					:text="$t('components.pagination.previous_page')"
					:title="$t('components.pagination.previous_page')"
					:disabled="isInFirstPage"
				>
					<span class="text-primary-700 dark:text-primary-100"
						><IconFaSolid:angleLeft
					/></span>
				</Anchor>
			</li>

			<li v-if="shouldDisplayFirstPage" class="first-page">
				<Anchor
					:to="{
						path: link,
						query: {
							page: firstPageNumber,
							ordering: route.query?.ordering
						}
					}"
					:class="{
						'grid grid-cols-2 gap-1': shouldDisplayPreviousTripleDots,
						disabled: isInFirstPage
					}"
					:text="$t('components.pagination.first_page')"
					:title="$t('components.pagination.first_page')"
					:disabled="isInFirstPage"
				>
					<span
						:class="{
							'grid items-center justify-center w-full rounded bg-zinc-200 dark:bg-zinc-800 py-1 px-2 text-primary-700 dark:text-primary-100': true,
							'bg-primary-400 dark:bg-primary-400': isInFirstPage
						}"
						>{{ firstPageNumber }}</span
					>
					<span
						v-if="shouldDisplayPreviousTripleDots"
						class="grid self-end justify-self-start text-sm text-primary-700 dark:text-primary-100"
						>...</span
					>
				</Anchor>
			</li>

			<li v-for="(pageEntry, index) in pages" :key="pageEntry" class="page">
				<Anchor
					:to="{
						path: link,
						query: {
							page: pageEntry,
							ordering: route.query?.ordering
						}
					}"
					:class="{
						'grid items-center justify-center w-full rounded bg-zinc-200 dark:bg-zinc-800 py-1 px-2': true,
						active: page === pageEntry
					}"
					:text="String(index)"
					:title="$t('components.pagination.go_to_page', { page: pageEntry })"
				>
					<span class="text-primary-700 dark:text-primary-100">{{ pageEntry }}</span>
				</Anchor>
			</li>

			<li v-if="shouldDisplayLastPage" class="last-page">
				<Anchor
					:to="{
						path: link,
						query: {
							page: lastPageNumber,
							ordering: route.query?.ordering
						}
					}"
					:class="{
						'grid grid-cols-2 gap-1': shouldDisplayNextTripleDots,
						disabled: isInLastPage,
						active: isInLastPage
					}"
					:text="$t('components.pagination.last_page')"
					:title="$t('components.pagination.go_to_page', { page: lastPageNumber })"
				>
					<span
						v-if="shouldDisplayNextTripleDots"
						class="grid self-end justify-self-end text-sm text-primary-700 dark:text-primary-100"
						>...</span
					>
					<span
						:class="{
							'grid items-center justify-center w-full rounded bg-zinc-200 dark:bg-zinc-800 py-1 px-2 text-primary-700 dark:text-primary-100': true,
							'bg-primary-400 dark:bg-primary-400': isInLastPage
						}"
						>{{ lastPageNumber }}</span
					>
				</Anchor>
			</li>

			<li class="next-page">
				<Anchor
					:to="{
						path: link,
						query: {
							page: page + 1,
							ordering: route.query?.ordering
						}
					}"
					:class="{
						disabled: isInLastPage,
						active: isInLastPage
					}"
					:text="$t('components.pagination.next_page')"
					:title="
						isInLastPage
							? $t('components.pagination.you_are_on_last_page')
							: $t('components.pagination.next_page')
					"
				>
					<span class="text-primary-700 dark:text-primary-100"
						><IconFaSolid:angleRight
					/></span>
				</Anchor>
			</li>
		</ol>
	</div>
</template>

<style lang="scss" scoped>
.pagination {
	.pagination-ordered-list {
		grid-template-columns: auto auto 1fr auto auto auto auto;
	}
}
</style>
