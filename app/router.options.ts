import type { RouterConfig } from '@nuxt/schema'

export default <RouterConfig>{
	async scrollBehavior(to, from, savedPosition) {
		const nuxtApp = useNuxtApp()

		// make sure the route has changed.
		if (nuxtApp.$18n && to.name !== from.name) {
			// `$i18n` is injected in the `setup` of the nuxtjs/i18n module.
			// `scrollBehavior` is guarded against being called even when it is not completed
			await nuxtApp.$i18n.waitForPendingLocaleChange()
		}

		// If history back
		if (savedPosition) {
			// Handle Suspense resolution
			return new Promise((resolve) => {
				nuxtApp.hooks.hookOnce('page:finish', () => {
					setTimeout(() => resolve(savedPosition), 50)
				})
			})
		}
		// Scroll to heading on click
		if (to.hash) {
			setTimeout(() => {
				let heading = document.querySelector(`[id="${to.hash.replace('#', '')}"]`) as any
				if (!heading) heading = document.querySelector(`[href$="${to.hash}"]`) as any
				if (!heading) return
				return window.scrollTo({
					top: heading.offsetTop,
					behavior: 'smooth'
				})
			})
			return
		}

		// route change
		if (from.path !== to.path) {
			window.scrollTo({
				top: 0,
				behavior: 'smooth'
			})
			return
		}

		return { top: 0 }
	}
}
