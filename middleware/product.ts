import { Product } from '~/types/product/product'

export default defineNuxtRouteMiddleware(async (to, from) => {
	const nuxtApp = useNuxtApp()

	if (!('id' in to.params)) {
		return navigateTo('/')
	}

	const product = await $fetch<Product>(`/api/product/${to.params.id}`)
	const productSlug = product.slug
	const productId = product.id
	const currentLocale = nuxtApp.$i18n.locale.value
	const defaultLocale = nuxtApp.$i18n.fallbackLocale.value

	if ('slug' in to.params && to.params.slug !== productSlug) {
		if (currentLocale === defaultLocale) {
			const path = `/product/${productId}/${product.slug}`
			return navigateTo(path)
		} else {
			const path = `/${currentLocale}/product/${productId}/${product.slug}`
			return navigateTo(path)
		}
	}
})
