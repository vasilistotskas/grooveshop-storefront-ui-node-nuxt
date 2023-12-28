<script lang="ts" setup>
import type { Ref } from 'vue'
import emptyIcon from '~icons/mdi/package-variant-remove'
import type { EntityOrdering, OrderingOption } from '~/types/ordering'
import type { BlogPost, BlogPostOrderingField, BlogPostQuery } from '~/types/blog/post'

const route = useRoute()
const { t } = useI18n()

const blogPostStore = useBlogPostStore()
const { posts, pending } = storeToRefs(blogPostStore)
const { fetchBlogPosts } = blogPostStore

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
	return usePagination<BlogPost>(posts.value)
})

const ordering = computed(() => {
	return useOrdering<BlogPostOrderingField>(entityOrdering.value, orderingFields)
})

const routePaginationParams = computed<BlogPostQuery>(() => {
	const page = Number(route.query.page) || 1
	const ordering = route.query.ordering || '-createdAt'
	const id = route.query.id || undefined
	const author = route.query.author || undefined
	const slug = route.query.slug || undefined
	const tags = route.query.tags || undefined
	const expand = 'true'

	return {
		page,
		ordering,
		id,
		author,
		slug,
		tags,
		expand
	}
})

await fetchBlogPosts(routePaginationParams.value)
const refreshBlogPosts = async () => await fetchBlogPosts(routePaginationParams.value)

watch(
	() => route.query,
	() => refreshBlogPosts()
)
</script>

<template>
	<div class="posts-list grid gap-4">
		<template v-if="!pending.posts && posts?.results?.length">
			<div class="flex gap-2 flex-row items-center">
				<PaginationPageNumber
					:count="pagination.count"
					:total-pages="pagination.totalPages"
					:page-total-results="pagination.pageTotalResults"
					:page-size="pagination.pageSize"
					:page="pagination.page"
					:links="pagination.links"
				/>
				<Ordering
					:ordering="String(routePaginationParams.ordering)"
					:ordering-options="ordering.orderingOptionsArray.value"
				/>
			</div>
			<section class="flex gap-4 md:gap-8">
				<ol
					class="w-full grid items-center justify-center grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4"
				>
					<template v-for="(post, index) in posts.results" :key="index">
						<BlogPostCard :post="post" :img-loading="index > 7 ? 'lazy' : 'eager'" />
					</template>
				</ol>
				<BlogTagsList />
			</section>
		</template>
		<template v-if="!pending.posts && !posts?.results?.length">
			<EmptyState :icon="emptyIcon">
				<template #actions>
					<MainButton
						:text="$t('common.empty.button')"
						:type="'link'"
						:to="'index'"
					></MainButton>
				</template>
			</EmptyState>
		</template>
	</div>
</template>
