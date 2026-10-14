import { describe, expect, it } from 'vitest'
import { mapLinks } from '~/utils/mapLinks'

describe('mapLinks', () => {
  it('points both apps at the coordinates, and names the Apple place card', () => {
    expect(mapLinks({ lat: 40.56325, lng: 22.10968, address: 'Φυτειά Βέροιας', name: 'Εκ Φύσεως Φυτειάς' })).toEqual({
      google: 'https://www.google.com/maps/search/?api=1&query=40.56325%2C22.10968',
      apple: 'https://maps.apple.com/place?coordinate=40.56325,22.10968&name=%CE%95%CE%BA%20%CE%A6%CF%8D%CF%83%CE%B5%CF%89%CF%82%20%CE%A6%CF%85%CF%84%CE%B5%CE%B9%CE%AC%CF%82',
    })
  })

  it('takes a zero coordinate as a place, not as a missing value', () => {
    expect(mapLinks({ lat: 0, lng: 0 })?.google).toBe('https://www.google.com/maps/search/?api=1&query=0%2C0')
  })

  it('searches for the address when the band has no coordinates', () => {
    expect(mapLinks({ address: 'Φυτειά Βέροιας, Ημαθία' })).toEqual({
      google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Φυτειά Βέροιας, Ημαθία')}`,
      apple: `https://maps.apple.com/place?address=${encodeURIComponent('Φυτειά Βέροιας, Ημαθία')}`,
    })
  })

  it('has nothing to link to without coordinates or an address', () => {
    expect(mapLinks({ name: 'Εκ Φύσεως Φυτειάς' })).toBeNull()
  })
})
