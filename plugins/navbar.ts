export default defineNuxtPlugin(() => {
	// when page redirect on mobile device, close drawer navbar
	onNuxtReady(async () => {
		const showDrawer = await useState<boolean>('navbar.showDrawer', () => false)
		const showOptions = await useState<boolean>('navbar.showOptions', () => false)
		showDrawer.value = false
		showOptions.value = false
	})
})
