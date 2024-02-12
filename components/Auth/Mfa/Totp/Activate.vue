<script lang="ts" setup>
const { totpActivateGet } = useAuthMfa()

const { data } = await totpActivateGet()
</script>

<template>
	<section
		class="container-xxs relative grid items-center justify-center justify-items-center gap-1 p-0 md:px-6"
	>
		<div v-if="data" class="grid items-center justify-center justify-items-center gap-4">
			<!-- eslint-disable vue/no-v-html -->
			<p v-html="data.totpSvg"></p>
			<p
				class="text-primary-500 dark:text-primary-400 rounded-md border border-gray-900/10 p-2 text-xs italic dark:border-gray-50/[0.2] md:text-base"
			>
				{{ data.secret }}
			</p>
		</div>
	</section>
</template>
