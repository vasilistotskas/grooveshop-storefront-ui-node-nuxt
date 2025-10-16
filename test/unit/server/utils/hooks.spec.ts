import { describe, it, expect, vi } from 'vitest'
import { allAuthHooks } from '../../../../server/utils/hooks'
import type { AllAuthHooks } from '../../../../server/utils/hooks'

describe('Server Utils - Hooks', () => {
  describe('allAuthHooks', () => {
    it('should be defined', () => {
      expect(allAuthHooks).toBeDefined()
    })

    it('should have hook method', () => {
      expect(allAuthHooks.hook).toBeDefined()
      expect(typeof allAuthHooks.hook).toBe('function')
    })

    it('should have callHook method', () => {
      expect(allAuthHooks.callHook).toBeDefined()
      expect(typeof allAuthHooks.callHook).toBe('function')
    })

    it('should register and call authChange hook', async () => {
      const mockHandler = vi.fn()
      const mockDetail = { status: 200, data: { user: 'test' } }

      allAuthHooks.hook('authChange', mockHandler)
      await allAuthHooks.callHook('authChange', { detail: mockDetail })

      expect(mockHandler).toHaveBeenCalledWith({ detail: mockDetail })
    })

    it('should handle multiple hook registrations', async () => {
      const mockHandler1 = vi.fn()
      const mockHandler2 = vi.fn()
      const mockDetail = { status: 200, data: {} }

      allAuthHooks.hook('authChange', mockHandler1)
      allAuthHooks.hook('authChange', mockHandler2)
      await allAuthHooks.callHook('authChange', { detail: mockDetail })

      expect(mockHandler1).toHaveBeenCalled()
      expect(mockHandler2).toHaveBeenCalled()
    })

    it('should handle async hook handlers', async () => {
      const mockHandler = vi.fn().mockResolvedValue(undefined)
      const mockDetail = { status: 200, data: {} }

      allAuthHooks.hook('authChange', mockHandler)
      await allAuthHooks.callHook('authChange', { detail: mockDetail })

      expect(mockHandler).toHaveBeenCalledWith({ detail: mockDetail })
    })

    it('should handle error responses in authChange hook', async () => {
      const mockHandler = vi.fn()
      const mockError = { status: 400, errors: [{ message: 'Error' }] }

      allAuthHooks.hook('authChange', mockHandler)
      await allAuthHooks.callHook('authChange', { detail: mockError })

      expect(mockHandler).toHaveBeenCalledWith({ detail: mockError })
    })
  })

  describe('AllAuthHooks interface', () => {
    it('should define authChange hook signature', () => {
      const mockHook: AllAuthHooks = {
        authChange: async ({ detail }) => {
          expect(detail).toBeDefined()
        },
      }

      expect(mockHook.authChange).toBeDefined()
      expect(typeof mockHook.authChange).toBe('function')
    })
  })
})
