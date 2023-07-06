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
		<main class="relative flex-1 flex flex-col mx-auto max-w-8xl w-full h-full">
			<div class="flex flex-col min-h-screen">
				<slot name="header">
					<TestingNavbar>
						<template #drawer>
							<TestingSidebar mode="mobile" />
						</template>
					</TestingNavbar>
				</slot>
				<div class="flex-1 w-full flex flex-col">
					<div class="relative flex-1 flex flex-row mx-auto w-full h-full">
						<div class="lg:pl-8 py-4">
							<TestingSidebar />
						</div>
						<div class="flex flex-col w-full lg:ml-30 xl:ml-40">
							<slot />
							<slot name="footer">
								<PageFooter />
							</slot>
						</div>
					</div>
				</div>
			</div>
		</main>
		<slot name="app-after" />
		<div id="app-after"></div>
		<Pwa />
	</div>
</template>
