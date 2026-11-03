import { describe, expect, it } from 'vitest'
import { STATIC_LAYOUT_ROUTES, staticLayoutPageTypesFor } from '~~/shared/utils/staticLayoutRoutes'

describe('staticLayoutPageTypesFor', () => {
  it('lists every page type for no design', () => {
    expect(staticLayoutPageTypesFor()).toEqual(Object.keys(STATIC_LAYOUT_ROUTES))
  })

  it('gives a design the page types that name no design and the ones that name it', () => {
    expect(staticLayoutPageTypesFor('webside')).toEqual(Object.keys(STATIC_LAYOUT_ROUTES))
  })

  it('leaves the page types of another design out', () => {
    expect(staticLayoutPageTypesFor('ekfyseosfyteias')).toEqual(['home', 'products', 'blog', 'blog-post', 'contact', 'feedback'])
  })
})
