import { describe, expect, it } from 'vitest'
import { BUILDER_SCHEMATICS, BUILDER_SCHEMATIC_VIEW } from '~/utils/builderSchematics'
import type { BlockDefinition } from '~~/shared/types/builder'

/**
 * Every card of the add-section library has its picture: each block with a
 * preset to insert has a schematic, there is none for a block that does not
 * exist, and every shape stays inside the canvas.
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('../../../../app/blocks/*.block.ts', { eager: true })
const offered = Object.values(modules).map(module => module.default).filter(block => !block.deprecated && block.presets?.length).map(block => block.type).sort()

describe('the library\'s schematics', () => {
  it('draw every block the library offers, and only those', () => {
    expect(Object.keys(BUILDER_SCHEMATICS).sort()).toEqual(offered)
  })

  it('keep every shape inside the canvas, with a size', () => {
    const outside = Object.entries(BUILDER_SCHEMATICS).flatMap(([type, shapes]) => shapes
      .filter(({ x, y, width, height }) => width <= 0 || height <= 0 || x < 0 || y < 0
        || x + width > BUILDER_SCHEMATIC_VIEW.width || y + height > BUILDER_SCHEMATIC_VIEW.height)
      .map(shape => `${type}: ${JSON.stringify(shape)}`))

    expect(outside).toEqual([])
  })
})
