import { describe, it, expect, vi } from 'vitest'
import { useSyncProps } from '~/composables/useSyncProps'

describe('useSyncProps Composable', () => {
  describe('Basic Functionality', () => {
    it('should return computed property that gets value from props', () => {
      const props = { modelValue: 'test' }
      const emit = vi.fn()
      
      const syncedProp = useSyncProps(props, 'modelValue', emit)
      
      expect(syncedProp.value).toBe('test')
    })

    it('should emit update event when value is set', () => {
      const props = { modelValue: 'initial' }
      const emit = vi.fn()
      
      const syncedProp = useSyncProps(props, 'modelValue', emit)
      syncedProp.value = 'updated'
      
      expect(emit).toHaveBeenCalledWith('update:modelValue', 'updated')
    })

    it('should work with different prop names', () => {
      const props = { title: 'My Title' }
      const emit = vi.fn()
      
      const syncedProp = useSyncProps(props, 'title', emit)
      
      expect(syncedProp.value).toBe('My Title')
      
      syncedProp.value = 'New Title'
      expect(emit).toHaveBeenCalledWith('update:title', 'New Title')
    })
  })

  describe('Type Handling', () => {
    it('should handle string values', () => {
      const props = { value: 'string' }
      const emit = vi.fn()
      
      const syncedProp = useSyncProps<string>(props, 'value', emit)
      
      expect(syncedProp.value).toBe('string')
      syncedProp.value = 'new string'
      expect(emit).toHaveBeenCalledWith('update:value', 'new string')
    })

    it('should handle number values', () => {
      const props = { count: 42 }
      const emit = vi.fn()
      
      const syncedProp = useSyncProps<number>(props, 'count', emit)
      
      expect(syncedProp.value).toBe(42)
      syncedProp.value = 100
      expect(emit).toHaveBeenCalledWith('update:count', 100)
    })

    it('should handle boolean values', () => {
      const props = { isActive: true }
      const emit = vi.fn()
      
      const syncedProp = useSyncProps<boolean>(props, 'isActive', emit)
      
      expect(syncedProp.value).toBe(true)
      syncedProp.value = false
      expect(emit).toHaveBeenCalledWith('update:isActive', false)
    })

    it('should handle object values', () => {
      const props = { data: { id: 1, name: 'Test' } }
      const emit = vi.fn()
      
      const syncedProp = useSyncProps<{ id: number, name: string }>(props, 'data', emit)
      
      expect(syncedProp.value).toEqual({ id: 1, name: 'Test' })
      
      const newData = { id: 2, name: 'Updated' }
      syncedProp.value = newData
      expect(emit).toHaveBeenCalledWith('update:data', newData)
    })

    it('should handle array values', () => {
      const props = { items: [1, 2, 3] }
      const emit = vi.fn()
      
      const syncedProp = useSyncProps<number[]>(props, 'items', emit)
      
      expect(syncedProp.value).toEqual([1, 2, 3])
      
      const newItems = [4, 5, 6]
      syncedProp.value = newItems
      expect(emit).toHaveBeenCalledWith('update:items', newItems)
    })

    it('should handle null values', () => {
      const props = { value: null }
      const emit = vi.fn()
      
      const syncedProp = useSyncProps<string | null>(props, 'value', emit)
      
      expect(syncedProp.value).toBeNull()
      syncedProp.value = 'not null'
      expect(emit).toHaveBeenCalledWith('update:value', 'not null')
    })

    it('should handle undefined values', () => {
      const props = { value: undefined }
      const emit = vi.fn()
      
      const syncedProp = useSyncProps<string | undefined>(props, 'value', emit)
      
      expect(syncedProp.value).toBeUndefined()
      syncedProp.value = 'defined'
      expect(emit).toHaveBeenCalledWith('update:value', 'defined')
    })
  })

  describe('Reactivity', () => {
    it('should reflect prop changes', () => {
      const props = reactive({ modelValue: 'initial' })
      const emit = vi.fn()
      
      const syncedProp = useSyncProps(props, 'modelValue', emit)
      
      expect(syncedProp.value).toBe('initial')
      
      props.modelValue = 'changed'
      expect(syncedProp.value).toBe('changed')
    })

    it('should emit multiple times for multiple sets', () => {
      const props = { value: 0 }
      const emit = vi.fn()
      
      const syncedProp = useSyncProps<number>(props, 'value', emit)
      
      syncedProp.value = 1
      syncedProp.value = 2
      syncedProp.value = 3
      
      expect(emit).toHaveBeenCalledTimes(3)
      expect(emit).toHaveBeenNthCalledWith(1, 'update:value', 1)
      expect(emit).toHaveBeenNthCalledWith(2, 'update:value', 2)
      expect(emit).toHaveBeenNthCalledWith(3, 'update:value', 3)
    })
  })

  describe('Edge Cases', () => {
    it('should handle non-existent prop key', () => {
      const props = { other: 'value' }
      const emit = vi.fn()
      
      const syncedProp = useSyncProps(props, 'nonExistent', emit)
      
      expect(syncedProp.value).toBeUndefined()
    })

    it('should work with empty props object', () => {
      const props = {}
      const emit = vi.fn()
      
      const syncedProp = useSyncProps(props, 'value', emit)
      
      expect(syncedProp.value).toBeUndefined()
      
      syncedProp.value = 'test'
      expect(emit).toHaveBeenCalledWith('update:value', 'test')
    })

    it('should handle same value being set', () => {
      const props = { value: 'same' }
      const emit = vi.fn()
      
      const syncedProp = useSyncProps(props, 'value', emit)
      
      syncedProp.value = 'same'
      expect(emit).toHaveBeenCalledWith('update:value', 'same')
    })
  })

  describe('v-model Pattern', () => {
    it('should work with v-model:modelValue pattern', () => {
      const props = { modelValue: 'initial' }
      const emit = vi.fn()
      
      const model = useSyncProps(props, 'modelValue', emit)
      
      // Simulating v-model usage
      expect(model.value).toBe('initial')
      model.value = 'user input'
      expect(emit).toHaveBeenCalledWith('update:modelValue', 'user input')
    })

    it('should work with custom v-model names', () => {
      const props = { title: 'Original Title' }
      const emit = vi.fn()
      
      const titleModel = useSyncProps(props, 'title', emit)
      
      expect(titleModel.value).toBe('Original Title')
      titleModel.value = 'New Title'
      expect(emit).toHaveBeenCalledWith('update:title', 'New Title')
    })
  })
})
