<script setup lang="ts">
defineSlots<{
	default(props: {}): any
	main(props: {}): any
	header(props: {}): any
	footer(props: {}): any
	'app-before'(props: {}): any
	'app-after'(props: {}): any
}>()
</script>

<template>
	<div class="relative">
		<div id="app-before">
			<slot name="app-before" />
		</div>
		<div class="flex flex-col min-h-screen">
			<slot name="header">
				<TestingNavbar>
					<template #drawer>
						<TestingSidebar mode="mobile" />
					</template>
				</TestingNavbar>
			</slot>
			<slot name="main">
				<Main :main-class="'flex-1 w-full flex flex-col'">
					<div class="relative flex-1 flex flex-row mx-auto w-full h-full">
						<div class="lg:pl-8 py-4">
							<TestingSidebar />
						</div>
						<div class="flex flex-col w-full lg:ml-30 xl:ml-40">
							<slot />
						</div>
					</div>
				</Main>
			</slot>
			<slot name="footer">
				<Footer />
			</slot>
		</div>
		<div id="app-after">
			<slot name="app-after" />
		</div>
	</div>
</template>
