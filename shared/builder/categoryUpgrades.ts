import type { BlockUpgrade } from '../types/builder'

/**
 * The upgrade that moves the categories band onto a data setting
 * (`builderField.query('category')`).
 */

/**
 * Version 1 of the categories band (`parentId`, `limit`) to version 2
 * (`categories`): the children of that category when it named one, else the
 * main categories, as many as it asked for, or as its component drew when it
 * asked for none (`defaultLimit`).
 */
export function upgradeProductCategories(defaultLimit: number): BlockUpgrade {
  return ({ settings, ...body }) => {
    const { parentId, limit, ...kept } = settings
    const size = typeof limit === 'number' ? limit : defaultLimit
    const categories = typeof parentId === 'number'
      ? { mode: 'children', parent: parentId, limit: size }
      : { mode: 'roots', limit: size }
    return { ...body, settings: { ...kept, categories } }
  }
}
