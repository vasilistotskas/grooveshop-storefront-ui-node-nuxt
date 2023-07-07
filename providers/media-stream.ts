import { joinURL } from 'ufo'
import { defu } from 'defu'
import { ProviderGetImage } from '@nuxt/image'
import { createOperationsGenerator } from '#image'

const removePathExtension = (value: string) => value.replace(/\.[^/.]+$/, '')

const operationsGenerator = createOperationsGenerator({
	keyMap: {
		width: 'width',
		height: 'height',
		fit: 'fit',
		position: 'position',
		background: 'background',
		trimThreshold: 'trim',
		format: 'format'
	},
	valueMap: {
		fit: {
			contain: 'contain',
			cover: 'cover',
			fill: 'fill',
			inside: 'inside',
			outside: 'outside'
		},
		position: {
			centre: 'center',
			center: 'center',
			left: 'left',
			right: 'right',
			top: 'top',
			bottom: 'bottom',
			west: 'west',
			east: 'east',
			north: 'north',
			south: 'south',
			northwest: 'northwest',
			northeast: 'northeast',
			southwest: 'southwest',
			southeast: 'southeast',
			entropy: 'entropy',
			attention: 'attention'
		},
		background(value: string) {
			if (value === 'black') {
				return '000000'
			}
			if (value === 'white') {
				return 'FFFFFF'
			}
			return value
		},
		format: {
			webp: 'webp',
			jpg: 'jpg',
			jpeg: 'jpeg',
			png: 'png',
			gif: 'gif'
		}
	},
	joinWith: '/',
	formatter: (key: string, value: string) => `${value}`
})

const defaultModifiers = {
	width: 100,
	height: 100,
	fit: 'contain',
	position: 'entropy',
	background: 'transparent',
	trimThreshold: 5,
	format: 'jpg'
}

export const getImage: ProviderGetImage = (src: string, { modifiers = {} } = {}) => {
	const config = useRuntimeConfig()
	const baseURL = config.public.mediaStreamUrl as string
	if ('loading' in modifiers) {
		delete modifiers.loading
	}
	if ('quality' in modifiers) {
		delete modifiers.quality
	}
	const mergeModifiers = defu(modifiers, defaultModifiers)
	const operations = operationsGenerator(mergeModifiers as any)
	src = removePathExtension(src)

	return {
		url: joinURL(baseURL, src, operations)
	}
}
