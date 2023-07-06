<script setup lang="ts">
defineSlots<{
	default(props: {}): any
	header(props: {}): any
	footer(props: {}): any
	'app-before'(props: {}): any
	'app-after'(props: {}): any
}>()
</script>

<template>
	<div class="relative">
		<slot name="app-before" />
		<div id="app-before"></div>
		<slot name="header">
			<PageHeader>
				<PageNavbar />
			</PageHeader>
		</slot>
		<div class="relative flex-1 flex flex-col w-full h-full">
			<PageMain>
				<PageSection class="flex flex-col">
					<div class="flex-1 w-full flex flex-col">
						<slot />
					</div>
				</PageSection>
			</PageMain>
		</div>
		<slot name="footer">
			<PageFooter />
		</slot>
		<slot name="app-after" />
		<div id="app-after"></div>
		<Pwa />
	</div>
</template>
