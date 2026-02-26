import { describe, it, expect } from 'vitest'

describe('debug plugins', () => {
  it('should check nuxtApp', () => {
    const nuxtApp = useNuxtApp()
    const getterKeys = Object.getOwnPropertyNames(nuxtApp).filter(k => {
      const desc = Object.getOwnPropertyDescriptor(nuxtApp, k)
      return desc && (desc.get || desc.set)
    })
    console.log('nuxtApp getter keys:', getterKeys)
    
    // Check all nuxtApp properties 
    const allProps = Object.getOwnPropertyNames(nuxtApp)
    const propsWithDollar = allProps.filter(k => k.startsWith('$'))
    console.log('All $ props (own):', propsWithDollar)
    
    // Check prototype chain
    let proto = Object.getPrototypeOf(nuxtApp)
    while (proto && proto !== Object.prototype) {
      const protoKeys = Object.getOwnPropertyNames(proto).filter(k => k.startsWith('$'))
      if (protoKeys.length > 0) {
        console.log('Proto $ keys:', protoKeys)
      }
      proto = Object.getPrototypeOf(proto)
    }
  })
})
