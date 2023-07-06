<script lang="ts" setup>
defineSlots<{
	breadcrumb(props: {
		to: string | Record<string, unknown>
		title: unknown
		last: boolean
		first: boolean
	}): any
}>()

const route = useRoute()
const breadcrumbs = useBreadcrumbs()
const schemaBreadcrumbs = computed(() =>
	breadcrumbs.value.map((breadcrumb) => breadcrumb.schema)
)

useSchemaOrg([
	defineBreadcrumb({
		itemListElement: schemaBreadcrumbs
	})
])
const hasChildren = computed(() => breadcrumbs.value.length > 1)
const customBreadcrumbs = computed(() => {
	if (route.meta && 'customBreadcrumbs' in route.meta) {
		return route.meta.customBreadcrumbs
	}
	return false
})
</script>

<template>
	<PageSection
		v-if="hasChildren && !customBreadcrumbs"
		class="cp-breadcrumbs-breadcrumbs"
	>
		<nav class="cp-breadcrumbs-breadcrumbs-itm_li">
			<ul class="cp-breadcrumbs-breadcrumbs-itm">
				<template v-for="(item, key) in breadcrumbs" :key="key">
					<li>
						<slot
							name="breadcrumb"
							:to="item.to"
							:title="item.title"
							:last="key === breadcrumbs.length - 1"
							:first="key === 0"
						>
							<Anchor
								:to="item.to"
								:title="item.title"
								:class="[
									'cp-breadcrumbs-breadcrumbs-itm-lnk text-gray-700 dark:text-gray-200',
									{
										'cp-breadcrumbs-breadcrumbs-itm-lnk-first': key === 0
									}
								]"
							>
								<span
									v-show="key > 0"
									class="cp-breadcrumbs-breadcrumbs-itm-lnk-delimiter"
								>
									{{ '&gt;' }}
								</span>
								<span class="cp-breadcrumbs-breadcrumbs-itm-lnk-text">{{
									item.title
								}}</span>
							</Anchor>
						</slot>
					</li>
				</template>
			</ul>
		</nav>
	</PageSection>
	<div v-else-if="!hasChildren" class="cp-breadcrumbs-breadcrumbs-empty"></div>
</template>

<style lang="scss" scoped>
.cp-breadcrumbs-breadcrumbs {
	padding: 0.5rem;
	&-itm_li {
		margin: 0;
		padding-left: 2rem;
		padding-right: 2rem;
		display: flex;
		overflow-x: auto;
		flex-wrap: nowrap;
		flex-direction: row;
		align-items: center;
		list-style-type: none;
		align-content: center;
		justify-content: flex-start;
	}

	&-itm {
		padding-left: 3px;
		flex-shrink: 0;
		display: flex;
		gap: 3px;
		&-lnk {
			display: grid;
			grid-template-columns: auto 1fr;
			align-items: center;
			gap: 3px;
			font-size: 12px;
			text-decoration: none;
			&-first {
				grid-template-columns: 1fr;
			}
			&:hover {
				color: white;
			}
		}
	}
	&-empty {
		height: 34px;
	}
}
</style>
