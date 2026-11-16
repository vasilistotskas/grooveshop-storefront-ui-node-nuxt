import { describe, expect, it } from 'vitest'
import { upgradeLeavingOutDefaults } from '~~/shared/builder/defaultUpgrades'

/**
 * A choice that lost the value its section draws when it is left out: a
 * stored setting holding that value goes, so the node draws what it drew and
 * fits the narrower choice. `upgrade-cases.json` runs it on every real block
 * that takes it; these are the shapes no real block's case reaches.
 */
const upgrade = upgradeLeavingOutDefaults({ '/surface': 'default', '/products/stock': 'any' })

describe('upgradeLeavingOutDefaults', () => {
  it('leaves out a setting that holds the default, at the top or inside a data setting', () => {
    const body = { settings: { surface: 'default', heading: 'Νέα', products: { mode: 'filter', stock: 'any', limit: 8 } } }

    expect(upgrade(body)).toEqual({ settings: { heading: 'Νέα', products: { mode: 'filter', limit: 8 } } })
  })

  it('keeps any other value, and what it does not name', () => {
    const body = { settings: { surface: 'muted', products: { mode: 'filter', stock: 'inStockOnly', limit: 8 }, look: 'bold' } }

    expect(upgrade(body)).toEqual(body)
  })

  it('passes over a setting that is not there, or a parent that is not an object', () => {
    expect(upgrade({ settings: {} })).toEqual({ settings: {} })
    expect(upgrade({ settings: { products: ['any'] } })).toEqual({ settings: { products: ['any'] } })
  })

  it('keeps the rest of the node and touches nothing it was given', () => {
    const body = { settings: { surface: 'default', products: { stock: 'any' } }, blocks: { a: { type: 'stat@1', settings: {} } }, blockOrder: ['a'] }
    const before = structuredClone(body)

    const after = upgrade(body)

    expect(after).toEqual({ settings: { products: {} }, blocks: body.blocks, blockOrder: ['a'] })
    expect(body).toEqual(before)
  })

  it('leaves out every value that draws the default', () => {
    const several = upgradeLeavingOutDefaults({ '/layout': ['tiles', 'grid'] })

    expect(several({ settings: { layout: 'tiles' } })).toEqual({ settings: {} })
    expect(several({ settings: { layout: 'grid' } })).toEqual({ settings: {} })
    expect(several({ settings: { layout: 'slider' } })).toEqual({ settings: { layout: 'slider' } })
  })
})
