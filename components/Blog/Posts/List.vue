<script lang="ts" setup>
import type { Ref } from 'vue'

import type { BlogPost, BlogPostOrderingField } from '~/types/blog/post'
import type { EntityOrdering, OrderingOption } from '~/types/ordering'
import type { Pagination } from '~/types/pagination'

import emptyIcon from '~icons/mdi/package-variant-remove'

const route = useRoute()
const { t } = useI18n()

const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-createdAt')
const id = computed(() => route.query.id)
const author = computed(() => route.query.author)
const slug = computed(() => route.query.slug)
const tags = computed(() => route.query.tags)
const expand = computed(() => 'true')

const { data, pending, refresh } = await useLazyAsyncData('blogPosts', () =>
	$fetch<Pagination<BlogPost>>('/api/blog/posts', {
		method: 'GET',
		params: {
			page: page.value,
			ordering: ordering.value,
			id: id.value,
			author: author.value,
			slug: slug.value,
			tags: tags.value,
			expand: expand.value
		}
	})
)

const entityOrdering: Ref<EntityOrdering<BlogPostOrderingField>> = ref([
	{
		value: 'createdAt',
		label: t('pages.blog.ordering.created_at'),
		options: ['ascending', 'descending']
	},
	{
		value: 'title',
		label: t('pages.blog.ordering.title'),
		options: ['ascending', 'descending']
	},
	{
		value: 'publishedAt',
		label: t('pages.blog.ordering.published_at'),
		options: ['ascending', 'descending']
	}
])

const orderingFields: Partial<Record<BlogPostOrderingField, OrderingOption[]>> = reactive(
	{
		createdAt: [],
		title: [],
		publishedAt: []
	}
)

const pagination = computed(() => {
	if (!data.value) return
	return usePagination<BlogPost>(data.value)
})

const orderingOptions = computed(() => {
	return useOrdering<BlogPostOrderingField>(entityOrdering.value, orderingFields)
})

watch(
	() => route.query,
	() => refresh(),
	{ deep: true }
)
</script>

<template>
	<div class="posts-list grid gap-4">
		<div class="flex flex-row items-center gap-2">
			<PaginationPageNumber
				v-if="pagination"
				:count="pagination.count"
				:total-pages="pagination.totalPages"
				:page-total-results="pagination.pageTotalResults"
				:page-size="pagination.pageSize"
				:page="pagination.page"
				:links="pagination.links"
			/>
			<Ordering
				:ordering="String(ordering)"
				:ordering-options="orderingOptions.orderingOptionsArray.value"
			/>
		</div>
		<section class="grid gap-4 md:flex md:gap-8">
			<ol
				class="row-start-2 grid w-full grid-cols-1 items-center justify-center gap-4 sm:grid-cols-1 md:row-start-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
			>
				<template v-if="!pending && data?.results?.length">
					<BlogPostCard
						v-for="(post, index) in data.results"
						:key="index"
						:post="post"
						:img-loading="index > 7 ? 'lazy' : 'eager'"
					/>
				</template>
				<template v-if="pending">
					<ClientOnlyFallback
						v-for="index in 8"
						:key="index"
						height="684px"
						width="100%"
					/>
				</template>
			</ol>
			<BlogTagsList />
		</section>
		<EmptyState v-if="!pending && !data?.results?.length" :icon="emptyIcon">
			<template #actions>
				<UButton :label="$t('common.empty.button')" :to="'index'" color="white" />
			</template>
		</EmptyState>
	</div>
</template>
