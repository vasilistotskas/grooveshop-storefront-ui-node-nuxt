import { describe, expect, it } from 'vitest'
import { zPageLayout, zPageSection } from '../../../shared/openapi/zod.gen'

describe('Shared Schemas - Page Config', () => {
  describe('zPageSection', () => {
    it('should parse valid section data', () => {
      const data = {
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        componentType: 'hero_carousel',
        title: 'Main Carousel',
        isVisible: true,
        props: { autoplay: true },
        sortOrder: 0,
      }
      const result = zPageSection.parse(data)
      expect(result.componentType).toBe('hero_carousel')
      expect(result.isVisible).toBe(true)
      expect(result.props).toEqual({ autoplay: true })
    })

    it('should parse section with empty props', () => {
      const data = {
        id: 2,
        uuid: '550e8400-e29b-41d4-a716-446655440001',
        componentType: 'spacer',
        title: '',
        isVisible: true,
        props: {},
        sortOrder: 1,
      }
      const result = zPageSection.parse(data)
      expect(result.props).toEqual({})
    })

    it('should reject missing required fields', () => {
      const data = {
        id: 1,
        componentType: 'spacer',
      }
      expect(() => zPageSection.parse(data)).toThrow()
    })
  })

  describe('zPageLayout', () => {
    it('should parse valid layout with sections', () => {
      const data = {
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        pageType: 'home',
        title: 'Homepage',
        isPublished: true,
        metadata: {},
        sections: [
          {
            id: 1,
            uuid: '550e8400-e29b-41d4-a716-446655440001',
            componentType: 'hero_carousel',
            title: '',
            isVisible: true,
            props: {},
            sortOrder: 0,
          },
        ],
      }
      const result = zPageLayout.parse(data)
      expect(result.pageType).toBe('home')
      expect(result.sections).toHaveLength(1)
    })

    it('should parse layout with empty sections', () => {
      const data = {
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        pageType: 'blog',
        title: 'Blog',
        isPublished: true,
        metadata: {},
        sections: [],
      }
      const result = zPageLayout.parse(data)
      expect(result.sections).toHaveLength(0)
    })

    it('should parse layout with metadata', () => {
      const data = {
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        pageType: 'home',
        title: 'Homepage',
        isPublished: false,
        metadata: { theme: 'dark', layout: 'wide' },
        sections: [],
      }
      const result = zPageLayout.parse(data)
      expect(result.metadata).toEqual({ theme: 'dark', layout: 'wide' })
      expect(result.isPublished).toBe(false)
    })

    it('should reject invalid data', () => {
      const data = {
        id: 'not-a-number',
        pageType: 'home',
      }
      expect(() => zPageLayout.parse(data)).toThrow()
    })
  })
})
