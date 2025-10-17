import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '~/stores/app'

describe('App Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('initial state', () => {
    it('should initialize with healthy state as true', () => {
      const store = useAppStore()
      expect(store.healthy).toBe(true)
    })
  })

  describe('healthCheck', () => {
    it('should have healthCheck method', () => {
      const store = useAppStore()
      expect(typeof store.healthCheck).toBe('function')
    })

    it('should allow setting healthy state', () => {
      const store = useAppStore()

      // Initially healthy
      expect(store.healthy).toBe(true)

      // Can be set to unhealthy
      store.healthy = false
      expect(store.healthy).toBe(false)

      // Can recover to healthy
      store.healthy = true
      expect(store.healthy).toBe(true)
    })
  })
})
