<script lang="ts" setup>
import { RedisData } from '~/server/api/test/index.get'

definePageMeta({
	layout: 'testing'
})

const { data: resDataSuccess } = await useFetch<string>('/api/test', {
	method: 'post',
	body: { text: 'Nuxt is Awesome!' }
})
const { data: resData } = await useFetch<RedisData>('/api/test')
</script>

<template>
	<PageWrapper class="container mt-1 min-h-full">
		<PageHeader>
			<PageTitle :text="$t('pages.testing.cache.title')" class="capitalize" />
		</PageHeader>
		<PageBody>
			<PageSection>
				<div class="text-gray-700 dark:text-gray-200">
					<div>Post state: {{ resDataSuccess }}</div>
					<div>Get Data: {{ resData?.text }}</div>
				</div>
			</PageSection>
		</PageBody>
	</PageWrapper>
</template>
