import type { ProviderGetImage } from '@nuxt/image'
import { defu } from 'defu'
import { joinURL } from 'ufo'
import { createOperationsGenerator } from '#image/utils'

const operationsGenerator = createOperationsGenerator({
  keyMap: {
    width: 'width',
    height: 'height',
    fit: 'fit',
    position: 'position',
    background: 'background',
    trimThreshold: 'trim',
    format: 'format',
  },
  valueMap: {
    fit: {
      contain: 'contain',
      cover: 'cover',
      fill: 'fill',
      inside: 'inside',
      outside: 'outside',
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
      attention: 'attention',
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
      gif: 'gif',
    },
  },
  joinWith: '/',
  formatter: (key: string, value: string) => `${value}`,
})

const defaultModifiers = {
  width: 100,
  height: 100,
  fit: 'contain',
  position: 'entropy',
  background: 'transparent',
  trimThreshold: 5,
  format: 'webp',
  quality: 80,
}

export const getImage: ProviderGetImage = (
  src: string,
  { modifiers = {} } = {},
) => {
  const config = useRuntimeConfig()
  const baseURL = config.public.mediaStreamPath as string

  const mergeModifiers = defu(modifiers, defaultModifiers)

  const operations = operationsGenerator(mergeModifiers)

  const url = joinURL(baseURL, src, operations)

  return {
    url,
  }
}
