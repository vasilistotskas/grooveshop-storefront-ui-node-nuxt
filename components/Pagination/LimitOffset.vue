<script lang="ts" setup>
const props = defineProps({
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
	page: {
		type: Number,
		required: true,
		default: 1
	},
	offset: {
		type: Number,
		required: true
	},
	limit: {
		type: Number,
		required: true,
		default: 10
	},
	maxVisibleButtons: {
		type: Number,
		required: false,
		default: 3
	}
})

const route = useRoute()
const { t } = useLang()

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
	const range: number[] = []
	let lastPageNumber: number
	if (!props.totalPages) {
		return range
	}
	if (props.totalPages < props.maxVisibleButtons) {
		lastPageNumber = props.totalPages
	} else {
		lastPageNumber = Math.min(
			startPage.value + props.maxVisibleButtons - 1,
			props.totalPages
		)
	}
	const startPageNumber = isInLastPage.value ? startPage.value - 1 : startPage.value
	for (let i = startPageNumber; i <= lastPageNumber; i += 1) {
		range.push(i)
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
			<li>
				<Anchor
					:to="{
						path: link,
						query: {
							limit,
							offset: isInFirstPage ? offset : offset - limit,
							ordering: route.query?.ordering
						}
					}"
					:class="{
						disabled: isInFirstPage
					}"
					:text="$t('components.pagination.previous_page')"
					:title="$t('components.pagination.previous_page')"
					:disabled="isInFirstPage"
				>
					<span class="text-gray-700 dark:text-gray-200"><IconFaSolid:angleLeft /></span>
				</Anchor>
			</li>

			<li v-if="shouldDisplayFirstPage">
				<Anchor
					:to="{
						path: link,
						query: { limit, offset: 0, ordering: route.query?.ordering }
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
							'grid items-center justify-center w-full rounded bg-gray-200 dark:bg-gray-800 py-1 px-2 text-gray-700 dark:text-gray-200': true,
							'bg-primary-400 dark:bg-primary-400': isInFirstPage
						}"
						>{{ firstPageNumber }}</span
					>
					<span
						v-if="shouldDisplayPreviousTripleDots"
						class="grid self-end justify-self-start text-sm text-gray-700 dark:text-gray-200"
						>...</span
					>
				</Anchor>
			</li>

			<li v-for="(pageNumber, index) in pages" :key="pageNumber">
				<Anchor
					:to="{
						path: link,
						query: {
							limit,
							offset: (pageNumber - 1) * limit,
							ordering: route.query?.ordering
						}
					}"
					:class="{
						'grid items-center justify-center w-full rounded bg-gray-200 dark:bg-gray-800 py-1 px-2': true,
						'bg-primary-400 dark:bg-primary-400': pageNumber === page
					}"
					:text="String(index)"
					:title="$t('components.pagination.go_to_page', { page: pageNumber })"
				>
					<span class="text-gray-700 dark:text-gray-200">{{ pageNumber }}</span>
				</Anchor>
			</li>

			<li v-if="shouldDisplayLastPage">
				<Anchor
					:to="{
						path: link,
						query: {
							limit,
							offset: (totalPages - 1) * limit,
							ordering: route.query?.ordering
						}
					}"
					:class="{
						'grid grid-cols-2 gap-1': shouldDisplayNextTripleDots,
						disabled: isInLastPage
					}"
					:text="$t('components.pagination.last_page')"
					:title="$t('components.pagination.go_to_page', { page: lastPageNumber })"
				>
					<span
						v-if="shouldDisplayNextTripleDots"
						class="grid self-end justify-self-end text-sm text-gray-700 dark:text-gray-200"
						>...</span
					>
					<span
						:class="{
							'grid items-center justify-center w-full rounded bg-gray-200 dark:bg-gray-800 py-1 px-2 text-gray-700 dark:text-gray-200': true,
							'bg-primary-400 dark:bg-primary-400': isInLastPage
						}"
						>{{ lastPageNumber }}</span
					>
				</Anchor>
			</li>

			<li>
				<Anchor
					:to="{
						path: link,
						query: {
							limit,
							offset: offset + limit,
							ordering: route.query?.ordering
						}
					}"
					:class="{
						disabled: isInLastPage
					}"
					:text="$t('components.pagination.next_page')"
					:title="
						isInLastPage
							? $t('components.pagination.you_are_on_last_page')
							: $t('components.pagination.next_page')
					"
				>
					<span class="text-gray-700 dark:text-gray-200"><IconFaSolid:angleRight /></span>
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
